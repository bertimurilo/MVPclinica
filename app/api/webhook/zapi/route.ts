import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { generateAgentResponse, isWithinBusinessHours } from '@/lib/agent'
import { sendMessage, normalizePhone } from '@/lib/zapi'
import type { AgentConfig } from '@/lib/types'
import { rateLimit } from '@/lib/rateLimit'

// Service role: no RLS, webhooks run without a user session.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

const WebhookSchema = z.object({
  phone: z.string().min(1),
  // Z-API sends "InstanceId" (capital I) — accept both
  instanceId: z.string().min(1).optional(),
  InstanceId: z.string().min(1).optional(),
  messageId: z.string().min(1),
  fromMe: z.boolean().default(false),
  type: z.string().optional(),
  text: z.object({
    message: z.string().optional(),
  }).optional(),
  senderName: z.string().optional(),
  pushName: z.string().optional(),
  chatName: z.string().optional(),
}).transform(data => ({
  ...data,
  instanceId: data.instanceId ?? data.InstanceId ?? '',
}))

export async function POST(req: NextRequest) {
  // Security: instanceId is verified against the DB — only valid clinics are processed.

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

  // Solo procesar ReceivedCallback
  if (parsed.data.type && parsed.data.type !== 'ReceivedCallback') {
    return NextResponse.json({ ok: true })
  }

  const { phone, instanceId, messageId } = parsed.data
  const text = parsed.data.text?.message
  const contactName = parsed.data.senderName ?? parsed.data.pushName ?? null

  // Only process text messages
  if (!text) {
    return NextResponse.json({ ok: true })
  }

  const rl = rateLimit(phone, 'zapi-webhook', { interval: 60 * 1000, limit: 10 })
  if (!rl.success) {
    return NextResponse.json({ ok: true }) // 200 silencioso para no alertar a Z-API
  }

  // Process asynchronously so Z-API doesn't time out waiting for us
  await processInbound({ phone, instanceId, messageId, text, contactName })

  return NextResponse.json({ ok: true })
}

async function processInbound({
  phone,
  instanceId,
  messageId,
  text,
  contactName,
}: {
  phone: string
  instanceId: string
  messageId: string
  text: string
  contactName: string | null
}) {
  try {
    // 1. Resolve clinic from Z-API instance ID
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, name, z_api_instance_id, z_api_token, z_api_client_token')
      .eq('z_api_instance_id', instanceId)
      .single()

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
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          clinic_id: clinicId,
          phone: normalizedPhone,
          source: 'whatsapp',
          name: contactName,
        })
        .select('id')
        .single()

      if (error || !newLead) {
        console.error('[webhook] Failed to create lead:', error)
        return
      }
      leadId = newLead.id
    }

    // 4. Deduplication: skip if this Z-API message was already processed
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id')
      .eq('z_api_message_id', messageId)
      .maybeSingle()
    if (existingMsg) return

    // 5. Insert inbound message
    const inboundCreatedAt = new Date().toISOString()
    await supabase.from('messages').insert({
      lead_id: leadId,
      clinic_id: clinicId,
      direction: 'inbound',
      content: text,
      sender: 'client',
      message_type: 'text',
      z_api_message_id: messageId,
      out_of_hours: !isOpen,
      created_at: inboundCreatedAt,
    })

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
        await supabase.from('leads').update({ escalated: true }).eq('id', leadId)
      } catch {}
      return
    }

    if (!result.was_sent || !result.responses.length) {
      // Lead escalated or config missing — human takes over from inbox
      return
    }

    // 7. Send each message via Z-API with a human-like delay between them
    const responseTimeSec = Math.round(
      (Date.now() - new Date(inboundCreatedAt).getTime()) / 1000
    )

    for (let i = 0; i < result.responses.length; i++) {
      const msg = result.responses[i]

      if (i > 0) {
        // Simulate human typing pause between messages (1.5s)
        await new Promise(r => setTimeout(r, 1500))
      }

      const sent = await sendMessage(
        normalizedPhone,
        msg,
        clinic.z_api_instance_id,
        clinic.z_api_token,
        clinic.z_api_client_token
      )

      if (!sent) {
        console.error('[webhook] Failed to send message via Z-API for lead:', leadId)
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
