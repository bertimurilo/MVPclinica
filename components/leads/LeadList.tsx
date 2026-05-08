import type { Lead } from '@/types'
import { LeadCard } from './LeadCard'

interface LeadListProps {
  leads: Lead[]
  onLeadClick?: (lead: Lead) => void
}

export function LeadList({ leads, onLeadClick }: LeadListProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-400">No hay leads todavía</p>
        <p className="text-xs text-gray-600 mt-1">
          Los leads aparecerán cuando lleguen mensajes de WhatsApp
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {leads.map(lead => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onClick={() => onLeadClick?.(lead)}
        />
      ))}
    </div>
  )
}
