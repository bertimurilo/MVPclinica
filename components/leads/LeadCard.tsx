import type { Lead } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LeadStatusBadge } from './LeadStatusBadge'
import { formatRelativeTime } from '@/lib/utils'

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
}

const scoreConfig = {
  cold: { label: 'Frío',      variant: 'blue'   as const },
  warm: { label: 'Tibio',     variant: 'yellow' as const },
  hot:  { label: 'Caliente',  variant: 'red'    as const },
}

const channelConfig = {
  whatsapp: { label: 'WhatsApp',  variant: 'emerald' as const },
  instagram:{ label: 'Instagram', variant: 'purple'  as const },
  web:      { label: 'Web',       variant: 'gray'    as const },
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const score   = scoreConfig[lead.score]
  const channel = channelConfig[lead.channel]
  const initials = (lead.name ?? lead.phone).charAt(0).toUpperCase()

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
        <Badge variant={channel.variant}>{channel.label}</Badge>
        {lead.last_contact_at && (
          <span className="text-xs text-gray-600 ml-auto">
            {formatRelativeTime(lead.last_contact_at)}
          </span>
        )}
      </div>
    </Card>
  )
}
