import { Badge } from '@/components/ui/Badge'
import type { Lead } from '@/types'

type StatusConfig = {
  label: string
  variant: 'blue' | 'yellow' | 'emerald' | 'purple' | 'gray'
}

const statusConfig: Record<Lead['status'], StatusConfig> = {
  new:       { label: 'Nuevo',          variant: 'blue' },
  contacted: { label: 'Contactado',     variant: 'yellow' },
  qualified: { label: 'Cualificado',    variant: 'emerald' },
  appointed: { label: 'Cita agendada',  variant: 'purple' },
  lost:      { label: 'Perdido',        variant: 'gray' },
}

export function LeadStatusBadge({ status }: { status: Lead['status'] }) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}
