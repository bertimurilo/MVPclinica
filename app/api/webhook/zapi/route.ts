import { waitUntil } from '@vercel/functions'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { generateAgentResponse, isWithinBusinessHours } from '@/lib/agent'
import { sendMessage, normalizePhone } from '@/lib/zapi'
import { notifyOwner, outOfHoursMessage, escalationMessage } from '@/lib/notifications'
import type { AgentConfig } from '@/lib/types'
import { rateLimit } from '@/lib/rateLimit'

// Service role: no RLS, webhooks run without a user session.
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

const WebhookSchema = z.object({
  phone: z.string().min(1),
  // Z-API sends "InstanceId" (capital I) — accept both
  instanceId: z.string().min(1).optional(),
  InstanceId: z.string().min(1).optional(),
  messageId: z.string().min(1),
  fromMe: z.boolean().default(false),
  isGroup: z.boolean().optional(),
  isNewsletter: z.boolean().optional(),
  broadcast: z.boolean().optional(),
  type: z.string().optional(),
  text: z.object({
    message: z.string().optional(),
  }).optional(),
  // Mensajes no-texto de Z-API: el payload trae un objeto con la clave del tipo.
  // Solo comprobamos presencia — el contenido multimedia no se procesa (MVP).
  audio: z.unknown().optional(),
  image: z.unknown().optional(),
  video: z.unknown().optional(),
  document: z.unknown().optional(),
  sticker: z.unknown().optional(),
  location: z.unknown().optional(),
  contact: z.unknown().optional(),
  senderName: z.string().optional(),
  pushName: z.string().optional(),
  chatName: z.string().optional(),
}).transform(data => ({
  ...data,
  instanceId: data.instanceId ?? data.InstanceId ?? '',
}))

export async function POST(req: NextRequest) {
  // Security — layer 1: validate Z_API_WEBHOOK_SECRET via query param.
  // Configure the webhook URL in Z-API dashboard as:
  //   https://yourdomain.com/api/webhook/zapi?secret=<Z_API_WEBHOOK_SECRET>
  // Z-API calls the URL exactly as configured, so the param arrives on every request.
  // Fail-closed: sin secret configurado en el servidor NO se acepta ningún request.
  // (Antes hacía fail-open con un warn: un typo en Vercel dejaba el endpoint abierto.)
  let expectedSecret: string
  try {
    expectedSecret = env.Z_API_WEBHOOK_SECRET
  } catch {
    console.error('[webhook] Z_API_WEBHOOK_SECRET no configurada — rechazando todos los requests')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const provided = req.nextUrl.searchParams.get('secret') ?? ''
  const expectedBuf = Buffer.from(expectedSecret, 'utf8')
  const providedBuf = Buffer.from(provided, 'utf8')
  const valid =
    expectedBuf.length === providedBuf.length &&
    timingSafeEqual(expectedBuf, providedBuf)
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Security — layer 2: instanceId is verified against the DB — only valid clinics are processed.

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const parsed = WebhookSchema.safeParse(body)
  if (!parsed.success) {
    // Non-text events (status updates, receipts) arrive here — ignore silently.
    return NextResponse.json({ ok: true })
  }

  // Ignorar mensajes enviados por nosotros (evita bucle infinito)
  if (parsed.data.fromMe) {
    return NextResponse.json({ ok: true })
  }

  // Grupos, canales y listas de difusión: el agente solo atiende chats 1:1.
  // El guard de longitud cubre payloads sin flag: un teléfono E.164 tiene máximo
  // 15 dígitos; los IDs de grupo ("1203634230800429…") son más largos.
  if (
    parsed.data.isGroup ||
    parsed.data.isNewsletter ||
    parsed.data.broadcast ||
    parsed.data.phone.replace(/\D/g, '').length > 15
  ) {
    return NextResponse.json({ ok: true })
  }

  // Solo procesar ReceivedCallback
  if (parsed.data.type && parsed.data.type !== 'ReceivedCallback') {
    return NextResponse.json({ ok: true })
  }

  const { phone, instanceId, messageId } = parsed.data
  const text = parsed.data.text?.message
  const contactName = parsed.data.senderName ?? parsed.data.pushName ?? null

  // Sin instanceId no se puede atribuir la clínica. Nunca buscar con '' — si
  // alguna clínica tuviera z_api_instance_id vacío, recibiría mensajes ajenos.
  if (!instanceId) {
    return NextResponse.json({ ok: true })
  }

  const d = parsed.data
  const nonTextType =
    d.audio != null ? 'audio' :
    d.image != null ? 'image' :
    d.video != null ? 'video' :
    d.document != null ? 'document' :
    d.sticker != null ? 'sticker' :
    d.location != null ? 'location' :
    d.contact != null ? 'contact' : null

  // Ni texto ni adjunto conocido: recibos de entrega, presencia, etc. — ignorar.
  if (!text && !nonTextType) {
    return NextResponse.json({ ok: true })
  }

  // Los no-texto y los textos gigantes no van al agente IA: se guardan (el equipo
  // los ve en el inbox y el agente los ve como contexto) y se responde un mensaje
  // fijo. Antes se descartaban en silencio y el paciente se quedaba sin respuesta.
  const NON_TEXT_LABELS: Record<string, string> = {
    audio: '[Audio recibido]',
    image: '[Imagen recibida]',
    video: '[Vídeo recibido]',
    document: '[Documento recibido]',
    sticker: '[Sticker recibido]',
    location: '[Ubicación recibida]',
    contact: '[Contacto recibido]',
  }

  let messageType = 'text'
  let storedContent = text ?? ''
  let cannedReply: string | null = null

  if (!text && nonTextType) {
    messageType = nonTextType
    storedContent = NON_TEXT_LABELS[nonTextType]
    cannedReply =
      nonTextType === 'sticker'
        ? null // un sticker no requiere respuesta; queda registrado en el inbox
        : 'Ahora mismo solo puedo leer mensajes de texto 😊 ¿Me lo puedes escribir por aquí?'
  } else if (text && text.length > 1000) {
    storedContent = text.slice(0, 1000) + '… [mensaje recortado]'
    cannedReply = 'Uy, ese mensaje es muy largo para mí 😅 ¿Me lo puedes resumir en un par de líneas?'
  }

  const rl = await rateLimit(phone, 'zapi-webhook', { interval: 60 * 1000, limit: 10 })
  if (!rl.success) {
    return NextResponse.json({ ok: true }) // 200 silencioso para no alertar a Z-API
  }

  // waitUntil keeps the Vercel function alive after the 200 response is sent.
  // Without it, Vercel terminates the function on response and processInbound never runs.
  waitUntil(
    processInbound({
      phone,
      instanceId,
      messageId,
      text: storedContent,
      messageType,
      cannedReply,
      contactName,
    }).catch(err =>
      console.error('[webhook] unhandled processInbound error:', err)
    )
  )

  return NextResponse.json({ ok: true })
}

async function processInbound({
  phone,
  instanceId,
  messageId,
  text,
  messageType,
  cannedReply,
  contactName,
}: {
  phone: string
  instanceId: string
  messageId: string
  text: string
  messageType: string
  cannedReply: string | null
  contactName: string | null
}) {
  try {
    // 1. Resolve clinic from Z-API instance ID
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, name, z_api_instance_id, z_api_token, z_api_client_token')
      .eq('z_api_instance_id', instanceId)
      .maybeSingle()

    if (!clinic) {
      console.warn('[webhook] No clinic found for instanceId:', instanceId)
      return
    }

    const clinicId: string = clinic.id
    const normalizedPhone = normalizePhone(phone)

    // 2. Load agent config to check business hours
    const { data: configRow } = await supabase
      .from('agent_config')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()

    const isOpen = configRow
      ? isWithinBusinessHours(configRow as AgentConfig)
      : true

    // 3. Find or create lead
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, name')
      .eq('clinic_id', clinicId)
      .eq('phone', normalizedPhone)
      .single()

    let leadId: string

    if (existingLead) {
      leadId = existingLead.id
      if (contactName && !(existingLead as { id: string; name: string | null }).name) {
        await supabase
          .from('leads')
          .update({ name: contactName })
          .eq('id', existingLead.id)
      }
    } else {
      // Dos webhooks casi simultáneos de un número nuevo ("Hola" + "quería info")
      // chocan con UNIQUE(clinic_id, phone). ignoreDuplicates → el perdedor no
      // recibe fila y recupera el lead que creó la request ganadora.
      const { data: newLead, error } = await supabase
        .from('leads')
        .upsert(
          {
            clinic_id: clinicId,
            phone: normalizedPhone,
            source: 'whatsapp',
            name: contactName,
          },
          { onConflict: 'clinic_id,phone', ignoreDuplicates: true }
        )
        .select('id')
        .maybeSingle()

      if (error) {
        console.error('[webhook] Failed to create lead:', error)
        return
      }
      if (newLead) {
        leadId = newLead.id
      } else {
        const { data: raceLead } = await supabase
          .from('leads')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('phone', normalizedPhone)
          .maybeSingle()
        if (!raceLead) {
          console.error('[webhook] Lead race re-select failed for phone:', normalizedPhone)
          return
        }
        leadId = raceLead.id
      }
    }

    // 4+5. Insert inbound message with atomic dedupe: la constraint UNIQUE
    // (clinic_id, z_api_message_id) convierte los reintentos de Z-API en no-ops.
    // ignoreDuplicates → INSERT ... ON CONFLICT DO NOTHING; sin fila devuelta = duplicado.
    const inboundCreatedAt = new Date().toISOString()
    const { data: insertedMsg, error: insertError } = await supabase
      .from('messages')
      .upsert(
        {
          lead_id: leadId,
          clinic_id: clinicId,
          direction: 'inbound',
          content: text,
          sender: 'client',
          message_type: messageType,
          z_api_message_id: messageId,
          out_of_hours: !isOpen,
          created_at: inboundCreatedAt,
        },
        { onConflict: 'clinic_id,z_api_message_id', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle()

    if (insertError) {
      console.error('[webhook] Failed to insert inbound message:', insertError)
      return
    }
    if (!insertedMsg) return // duplicado: ya procesado, no responder otra vez

    // 5b. Notify owner on out-of-hours messages (max 1 per lead per hour to avoid spam)
    if (!isOpen) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', leadId)
        .eq('out_of_hours', true)
        .gte('created_at', oneHourAgo)

      if ((count ?? 0) <= 1) {
        const leadName = existingLead ? (existingLead as { id: string; name: string | null }).name : contactName
        notifyOwner(clinicId, outOfHoursMessage(leadName, normalizedPhone, text, leadId), supabase).catch(() => {})
      }
    }

    // Debounce anti-ráfaga: los clientes escriben en mensajes cortos seguidos
    // ("Hola" + "quería info sobre láser"). Esperamos un momento y, si ya entró
    // un mensaje más reciente de este lead, este handler se retira — el handler
    // del último mensaje responderá una sola vez con el historial completo.
    // Sin esto, dos webhooks casi simultáneos generan dos respuestas cruzadas
    // y se pisan el conversation_stage entre sí.
    await new Promise(r => setTimeout(r, 3000))
    const { data: newerInbound } = await supabase
      .from('messages')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'inbound')
      .gt('created_at', inboundCreatedAt)
      .limit(1)
      .maybeSingle()
    if (newerInbound) return

    // No-texto sin respuesta fija (sticker): queda registrado en el inbox, nada más.
    if (messageType !== 'text' && !cannedReply) return

    let responses: string[]

    if (cannedReply) {
      // No-texto o texto gigante: respuesta fija sin pasar por el agente IA.
      responses = [cannedReply]
      await supabase.from('leads').update({ last_message_at: new Date().toISOString() }).eq('id', leadId)
    } else {
      // 6. Generate AI response
      const FALLBACK_MESSAGE =
        'Lo siento, estoy teniendo problemas técnicos en este momento. ' +
        'Un miembro de nuestro equipo te contactará pronto. 🙏'

      let result: Awaited<ReturnType<typeof generateAgentResponse>>
      try {
        result = await generateAgentResponse(leadId, clinicId, text)
      } catch (aiError) {
        console.error('[webhook] generateAgentResponse error:', aiError)
        try {
          await sendMessage(normalizedPhone, FALLBACK_MESSAGE, clinic.z_api_instance_id, clinic.z_api_token, clinic.z_api_client_token)
        } catch (fallbackError) {
          console.error('[webhook] Error enviando fallback:', fallbackError)
        }
        try {
          await supabase.from('leads').update({ escalated: true, conversation_stage: 'escalated' }).eq('id', leadId)
        } catch (error) {
          console.error('[webhook] escalate lead failed:', error)
        }
        const leadName = existingLead ? (existingLead as { id: string; name: string | null }).name : contactName
        notifyOwner(clinicId, escalationMessage(leadName, normalizedPhone, 'anthropic_error', leadId), supabase).catch(() => {})
        return
      }

      if (!result.was_sent || !result.responses.length) {
        // Lead escalated or config missing — human takes over from inbox
        return
      }
      responses = result.responses
    }

    // Re-check tras generar (tarda varios segundos): si mientras tanto llegó
    // otro mensaje del lead, descartamos esta respuesta sin enviarla — el
    // handler del mensaje nuevo responderá una sola vez con el contexto
    // completo. Extiende la cobertura del debounce a toda la generación.
    const { data: newerAfterGen } = await supabase
      .from('messages')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'inbound')
      .gt('created_at', inboundCreatedAt)
      .limit(1)
      .maybeSingle()
    if (newerAfterGen) return

    // 7. Send each message via Z-API with a human-like delay between them
    const responseTimeSec = Math.round(
      (Date.now() - new Date(inboundCreatedAt).getTime()) / 1000
    )

    for (let i = 0; i < responses.length; i++) {
      const msg = responses[i]

      if (i > 0) {
        // Simulate human typing pause between messages (1.5s)
        await new Promise(r => setTimeout(r, 1500))
      }

      // sendMessage devuelve false en errores HTTP pero LANZA en fallos de red
      // al agotar reintentos — ambos casos son "el paciente no recibió nada".
      let sent = false
      try {
        sent = await sendMessage(
          normalizedPhone,
          msg,
          clinic.z_api_instance_id,
          clinic.z_api_token,
          clinic.z_api_client_token
        )
      } catch (sendError) {
        console.error('[webhook] sendMessage threw for lead:', leadId, sendError)
      }

      if (!sent) {
        console.error('[webhook] Failed to send message via Z-API for lead:', leadId)
        await supabase.from('leads').update({ escalated: true, conversation_stage: 'escalated' }).eq('id', leadId)
        const leadName = existingLead ? (existingLead as { id: string; name: string | null }).name : contactName
        notifyOwner(clinicId, escalationMessage(leadName, normalizedPhone, 'send_failed', leadId), supabase).catch(() => {})
        break
      }

      // 8. Store each outbound message separately
      await supabase.from('messages').insert({
        lead_id: leadId,
        clinic_id: clinicId,
        direction: 'outbound',
        content: msg,
        sender: 'agent',
        message_type: 'text',
        response_time_seconds: i === 0 ? responseTimeSec : null,
        out_of_hours: !isOpen,
      })
    }
  } catch (err) {
    console.error('[webhook] processInbound error:', err)
  }
}
