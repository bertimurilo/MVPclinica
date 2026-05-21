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

  for (const lead of candidates ?? []) {
    const clinicRow = lead.clinics as unknown
    const clinic = (Array.isArray(clinicRow) ? clinicRow[0] : clinicRow) as { z_api_instance_id: string; z_api_token: string; z_api_client_token?: string | null } | null
    if (!clinic?.z_api_instance_id || !clinic?.z_api_token) continue

    try {
      const followUpType = await resolveFollowUpType(lead.id, now)
      if (!followUpType) continue // already inactive or sent too many

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
// Determine which follow-up to send, or null if none needed
// ---------------------------------------------------------------------------
async function resolveFollowUpType(
  leadId: string,
  nowMs: number
): Promise<'first' | 'close' | null> {
  // Get last inbound message
  const { data: lastInbound } = await supabase
    .from('messages')
    .select('created_at')
    .eq('lead_id', leadId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lastInbound) return null

  // Count outbound agent messages since last inbound
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('direction', 'outbound')
    .eq('sender', 'agent')
    .gt('created_at', lastInbound.created_at)

  const outboundCount = count ?? 0

  // Get time since last outbound
  const { data: lastOutbound } = await supabase
    .from('messages')
    .select('created_at')
    .eq('lead_id', leadId)
    .eq('direction', 'outbound')
    .gt('created_at', lastInbound.created_at)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lastOutbound) return null

  const hoursSince = (nowMs - new Date(lastOutbound.created_at).getTime()) / 3600000

  if (outboundCount === 1 && hoursSince >= 24) return 'first'
  if (outboundCount === 2 && hoursSince >= 48) return 'close'
  // 3+ outbound → already closed, mark inactive and stop
  if (outboundCount >= 3) {
    await supabase.from('leads').update({ status: 'inactivo' }).eq('id', leadId)
    return null
  }

  return null
}
