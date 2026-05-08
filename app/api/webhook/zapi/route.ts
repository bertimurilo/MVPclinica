import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { generateAgentResponse, isWithinBusinessHours } from '@/lib/agent'
import { sendMessage, normalizePhone } from '@/lib/zapi'
import type { AgentConfig } from '@/lib/types'

// Service role: no RLS, webhooks run without a user session.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const WebhookSchema = z.object({
  phone: z.string().min(1),
  instanceId: z.string().min(1),
  messageId: z.string().min(1),
  fromMe: z.boolean().default(false),
  type: z.string().optional(),
  text: z.object({
    message: z.string().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  // Validate secret from header or query param
  const expectedSecret = process.env.Z_API_WEBHOOK_SECRET
  if (expectedSecret) {
    const headerSecret = req.headers.get('x-webhook-secret')
    const querySecret = req.nextUrl.searchParams.get('secret')
    if (headerSecret !== expectedSecret && querySecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

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

  // Only process text messages
  if (!text) {
    return NextResponse.json({ ok: true })
  }

  // Process asynchronously so Z-API doesn't time out waiting for us
  void processInbound({ phone, instanceId, messageId, text })

  return NextResponse.json({ ok: true })
}

async function processInbound({
  phone,
  instanceId,
  messageId,
  text,
}: {
  phone: string
  instanceId: string
  messageId: string
  text: string
}) {
  try {
    // 1. Resolve clinic from Z-API instance ID
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, name, z_api_instance_id, z_api_token')
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
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('phone', normalizedPhone)
      .single()

    let leadId: string

    if (existingLead) {
      leadId = existingLead.id
    } else {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          clinic_id: clinicId,
          phone: normalizedPhone,
          source: 'whatsapp',
        })
        .select('id')
        .single()

      if (error || !newLead) {
        console.error('[webhook] Failed to create lead:', error)
        return
      }
      leadId = newLead.id
    }

    // 4. Insert inbound message
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

    // 5. Generate AI response
    const result = await generateAgentResponse(leadId, clinicId, text)

    if (!result.was_sent || !result.response) {
      // Lead escalated or config missing — human takes over from inbox
      return
    }

    // 6. Send via Z-API
    const sent = await sendMessage(
      normalizedPhone,
      result.response,
      clinic.z_api_instance_id,
      clinic.z_api_token
    )

    if (!sent) {
      console.error('[webhook] Failed to send message via Z-API for lead:', leadId)
    }

    // 7. Store outbound message with response time
    const responseTimeSec = Math.round(
      (Date.now() - new Date(inboundCreatedAt).getTime()) / 1000
    )

    await supabase.from('messages').insert({
      lead_id: leadId,
      clinic_id: clinicId,
      direction: 'outbound',
      content: result.response,
      sender: 'agent',
      message_type: 'text',
      response_time_seconds: responseTimeSec,
      out_of_hours: !isOpen,
    })
  } catch (err) {
    console.error('[webhook] processInbound error:', err)
  }
}
