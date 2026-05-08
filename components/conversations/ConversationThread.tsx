import type { Message, Lead } from '@/types'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge'

interface ConversationThreadProps {
  lead: Lead
  messages: Message[]
}

export function ConversationThread({ lead, messages }: ConversationThreadProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Thread header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-300">
            {(lead.name ?? lead.phone).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{lead.name ?? 'Sin nombre'}</p>
            <p className="text-xs text-gray-500">{lead.phone}</p>
          </div>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-600">Sin mensajes todavía</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex', msg.direction === 'outbound' && 'justify-end')}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5',
                  msg.direction === 'inbound'
                    ? 'bg-gray-800 text-white rounded-tl-sm'
                    : 'bg-emerald-500 text-white rounded-tr-sm'
                )}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={cn(
                  'text-xs mt-1.5',
                  msg.direction === 'inbound' ? 'text-gray-500' : 'text-emerald-100'
                )}>
                  {formatRelativeTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="px-5 py-4 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5">
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
          />
          <button className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
