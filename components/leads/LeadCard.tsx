import type { Lead } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LeadStatusBadge } from './LeadStatusBadge'
import { formatRelativeTime } from '@/lib/utils'

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
}

// score es number 0-100 → mapeamos a tramos
function getScoreTier(score: number): 'frio' | 'tibio' | 'caliente' {
  if (score >= 70) return 'caliente'
  if (score >= 40) return 'tibio'
  return 'frio'
}

const scoreConfig = {
  frio:     { label: 'Frío',      variant: 'blue'   as const },
  tibio:    { label: 'Tibio',     variant: 'yellow' as const },
  caliente: { label: 'Caliente',  variant: 'red'    as const },
}

const sourceConfig: Record<string, { label: string; variant: 'violet' | 'purple' | 'gray' }> = {
  whatsapp:  { label: 'WhatsApp',  variant: 'violet' },
  instagram: { label: 'Instagram', variant: 'purple' },
  web:       { label: 'Web',       variant: 'gray'   },
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const scoreTier = getScoreTier(lead.score)
  const score     = scoreConfig[scoreTier]
  const source    = sourceConfig[lead.source] ?? { label: lead.source, variant: 'gray' as const }
  const initials  = (lead.name ?? lead.phone).charAt(0).toUpperCase()

  return (
    <Card hover onClick={onClick} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center shrink-0 text-sm font-semibold text-gray-300">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {lead.name ?? 'Sin nombre'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>
          </div>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      <div className="flex items-center gap-2 mt-3.5 flex-wrap">
        <Badge variant={score.variant}>{score.label}</Badge>
        <Badge variant={source.variant}>{source.label}</Badge>
        {lead.last_message_at && (
          <span className="text-xs text-gray-600 ml-auto">
            {formatRelativeTime(lead.last_message_at)}
          </span>
        )}
      </div>
    </Card>
  )
}
