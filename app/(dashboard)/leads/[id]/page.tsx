import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentClinicId, getLead, getLeadTimeline, getTreatments } from '@/lib/actions'
import { LeadSidebarActions } from '@/components/leads/LeadSidebarActions'
import { LeadNameEditor } from '@/components/leads/LeadNameEditor'
import { ConversationPanel } from '@/components/leads/ConversationPanel'
import { AppointmentPanel } from '@/components/leads/AppointmentPanel'
import { ActivityTimeline } from '@/components/leads/ActivityTimeline'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { LeadQualification } from '@/lib/types'

export const metadata: Metadata = { title: 'Lead' }

const QUALIF: Record<LeadQualification, { label: string; cls: string }> = {
  frio:     { label: 'Frío',     cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  tibio:    { label: 'Tibio',    cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  caliente: { label: 'Caliente', cls: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  let clinicId: string
  try {
    clinicId = await getCurrentClinicId()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'No autenticado') redirect('/login')
    redirect('/onboarding')
  }

  const result = await getLead(params.id, clinicId)
  if (!result) redirect('/leads')

  const { lead, messages } = result
  const [timelineEvents, treatments] = await Promise.all([
    getLeadTimeline(params.id, clinicId),
    getTreatments(clinicId),
  ])
  const qualif = QUALIF[lead.qualification] ?? QUALIF.frio
  const initial = (lead.name ?? lead.phone).charAt(0).toUpperCase()

  return (
    <div className="max-w-5xl space-y-5">
      {/* Back */}
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Volver a leads
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left panel */}
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">

            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-base font-bold text-violet-400 shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <LeadNameEditor leadId={lead.id} initialName={lead.name ?? null} />
                <p className="text-sm text-gray-500">{lead.phone}</p>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-2.5 mb-5 pb-5 border-b border-gray-700">
              {lead.email && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 shrink-0">Email</span>
                  <span className="text-xs text-gray-300 truncate">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 shrink-0">Qualification</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${qualif.cls}`}>
                  {qualif.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 shrink-0">Score</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden" style={{ width: 56 }}>
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${lead.score}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{lead.score}</span>
                </div>
              </div>
              {lead.treatment_interest && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 shrink-0">Interés</span>
                  <span className="text-xs text-gray-300 truncate max-w-[140px]">
                    {lead.treatment_interest}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 shrink-0">Primer contacto</span>
                <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
              </div>
              {lead.last_message_at && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 shrink-0">Último mensaje</span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(lead.last_message_at)}</span>
                </div>
              )}
            </div>

            {/* Interactive: status, notes, escalate */}
            <LeadSidebarActions
              leadId={lead.id}
              clinicId={clinicId}
              status={lead.status}
              escalated={lead.escalated}
              notes={lead.notes}
            />
          </div>

          <AppointmentPanel
            appointments={lead.appointments ?? []}
            clinicId={clinicId}
            leadId={lead.id}
            treatments={treatments}
          />

          <ActivityTimeline events={timelineEvents} />
        </div>

        {/* Right panel — conversation */}
        <ConversationPanel
          leadId={lead.id}
          clinicId={clinicId}
          initialMessages={messages}
          escalated={lead.escalated}
        />

      </div>
    </div>
  )
}
