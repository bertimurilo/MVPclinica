import type { TimelineEvent } from '@/lib/types'

const EVENT_CONFIG: Record<
  TimelineEvent['type'],
  { icon: string; color: string; dotColor: string }
> = {
  lead_created:           { icon: '📍', color: 'text-gray-300', dotColor: 'bg-gray-500' },
  messages_day:           { icon: '💬', color: 'text-gray-400', dotColor: 'bg-gray-600' },
  appointment_proposed:   { icon: '📋', color: 'text-amber-400', dotColor: 'bg-amber-500' },
  appointment_confirmed:  { icon: '✅', color: 'text-violet-400', dotColor: 'bg-violet-500' },
  appointment_cancelled:  { icon: '❌', color: 'text-red-400', dotColor: 'bg-red-500' },
  escalated:              { icon: '🚨', color: 'text-amber-400', dotColor: 'bg-amber-500' },
  escalation_reset:       { icon: '🔄', color: 'text-gray-400', dotColor: 'bg-gray-500' },
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  events: TimelineEvent[]
}

export function ActivityTimeline({ events }: Props) {
  if (events.length === 0) return null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-4">Actividad</p>
      <ol className="relative border-l border-gray-700 space-y-4 ml-1">
        {events.map((event, i) => {
          const cfg = EVENT_CONFIG[event.type]
          return (
            <li key={i} className="ml-4">
              <span
                className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-gray-800 ${cfg.dotColor}`}
              />
              <div className="flex items-start gap-2">
                <span className="text-sm leading-none mt-0.5">{cfg.icon}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${cfg.color}`}>
                    {event.label}
                    {event.detail && (
                      <span className="text-gray-500 font-normal"> · {event.detail}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {event.type === 'messages_day' ? event.detail : formatTimestamp(event.timestamp)}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
