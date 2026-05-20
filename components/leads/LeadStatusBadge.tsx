import { Badge } from '@/components/ui/Badge'
import type { Lead, LeadStatus } from '@/lib/types'

type StatusConfig = {
  label: string
  variant: 'blue' | 'yellow' | 'violet' | 'purple' | 'gray' | 'red'
}

const statusConfig: Record<LeadStatus, StatusConfig> = {
  nuevo:         { label: 'Nuevo',          variant: 'blue'   },
  contactado:    { label: 'Contactado',      variant: 'yellow' },
  cita_agendada: { label: 'Cita agendada',   variant: 'purple' },
  convertido:    { label: 'Convertido',      variant: 'violet' },
  inactivo:      { label: 'Inactivo',        variant: 'gray'   },
  perdido:       { label: 'Perdido',         variant: 'red'    },
}

export function LeadStatusBadge({ status }: { status: Lead['status'] }) {
  const config = statusConfig[status] ?? { label: status, variant: 'gray' as const }
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}
