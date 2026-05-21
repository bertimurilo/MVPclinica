import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateFollowUpMessage } from '@/lib/agent'
import { sendMessage } from '@/lib/zapi'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Vercel cron jobs send: Authorization: Bearer <CRON_SECRET>
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV === 'development'
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const h24ago = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  // Leads that received pricing/presentation info and haven't responded in 24h+
  const { data: candidates, error } = await supabase
    .from('leads')
    .select(`
      id, clinic_id, phone, name, treatment_interest, status,
      clinics ( z_api_instance_id, z_api_token, z_api_client_token )
    `)
    .in('conversation_stage', ['pricing', 'presentation'])
    .eq('escalated', false)
    .not('status', 'in', '(inactivo,convertido,perdido)')
    .lt('last_message_at', h24ago)

  if (error) {
    console.error('[cron/followup] query error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const processed: { leadId: string; type: string; sent: boolean }[] = []

  // Batch: fetch all relevant messages for all candidate leads in one query
  const candidateIds = (candidates ?? []).map(l => l.id)
  const { data: allMessages } = candidateIds.length > 0
    ? await supabase
        .from('messages')
        .select('lead_id, direction, sender, created_at')
        .in('lead_id', candidateIds)
        .order('created_at', { ascending: false })
        .limit(20 * candidateIds.length)
    : { data: [] }

  const msgsByLead = new Map<string, Array<{ lead_id: string; direction: string; sender: string; created_at: string }>>()
  for (const msg of (allMessages ?? []) as Array<{ lead_id: string; direction: string; sender: string; created_at: string }>) {
    const arr = msgsByLead.get(msg.lead_id) ?? []
    arr.push(msg)
    msgsByLead.set(msg.lead_id, arr)
  }

  for (const lead of candidates ?? []) {
    const clinicRow = lead.clinics as unknown
    const clinic = (Array.isArray(clinicRow) ? clinicRow[0] : clinicRow) as { z_api_instance_id: string; z_api_token: string; z_api_client_token?: string | null } | null
    if (!clinic?.z_api_instance_id || !clinic?.z_api_token) continue

    try {
      const msgs = msgsByLead.get(lead.id) ?? []
      const { type: followUpType, markInactive } = resolveFollowUpType(msgs, now)
      if (markInactive) {
        await supabase.from('leads').update({ status: 'inactivo' }).eq('id', lead.id)
      }
      if (!followUpType) continue

      const result = await generateFollowUpMessage(lead.id, lead.clinic_id, followUpType)

      if (!result.was_sent || !result.responses.length) {
        processed.push({ leadId: lead.id, type: followUpType, sent: false })
        continue
      }

      let allSent = true
      for (let i = 0; i < result.responses.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 1500))
        const ok = await sendMessage(lead.phone, result.responses[i], clinic.z_api_instance_id, clinic.z_api_token, clinic.z_api_client_token)
        if (!ok) { allSent = false; break }

        await supabase.from('messages').insert({
          lead_id: lead.id,
          clinic_id: lead.clinic_id,
          direction: 'outbound',
          content: result.responses[i],
          sender: 'agent',
          message_type: 'text',
        })
      }

      processed.push({ leadId: lead.id, type: followUpType, sent: allSent })
    } catch (err) {
      console.error('[cron/followup] lead error:', lead.id, err)
      processed.push({ leadId: lead.id, type: 'error', sent: false })
    }
  }

  console.log('[cron/followup] processed:', processed.length, 'leads')
  return NextResponse.json({ ok: true, processed })
}

// ---------------------------------------------------------------------------
// Determine which follow-up to send — pure, synchronous, no DB calls
// ---------------------------------------------------------------------------
function resolveFollowUpType(
  msgs: Array<{ direction: string; sender: string; created_at: string }>,
  nowMs: number
): { type: 'first' | 'close' | null; markInactive: boolean } {
  const lastInbound = msgs.find(m => m.direction === 'inbound')
  if (!lastInbound) return { type: null, markInactive: false }

  const afterInbound = msgs.filter(m => m.created_at > lastInbound.created_at)
  const outboundCount = afterInbound.filter(m => m.direction === 'outbound' && m.sender === 'agent').length

  if (outboundCount >= 3) return { type: null, markInactive: true }

  const lastOutbound = afterInbound.find(m => m.direction === 'outbound')
  if (!lastOutbound) return { type: null, markInactive: false }

  const hoursSince = (nowMs - new Date(lastOutbound.created_at).getTime()) / 3600000

  if (outboundCount === 1 && hoursSince >= 24) return { type: 'first', markInactive: false }
  if (outboundCount === 2 && hoursSince >= 48) return { type: 'close', markInactive: false }

  return { type: null, markInactive: false }
}
