'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { sendHumanMessage } from '@/lib/actions'
import type { Message } from '@/lib/types'

interface ConversationPanelProps {
  leadId: string
  clinicId: string
  initialMessages: Message[]
  escalated: boolean
}

export function ConversationPanel({
  leadId,
  clinicId,
  initialMessages,
  escalated,
}: ConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const content = input.trim()
    if (!content || isPending) return

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      lead_id: leadId,
      clinic_id: clinicId,
      direction: 'outbound',
      sender: 'human',
      message_type: 'text',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setInput('')

    startTransition(async () => {
      await sendHumanMessage(leadId, clinicId, content)
    })
  }

  return (
    <div
      className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col"
      style={{ minHeight: '500px' }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Conversación</p>
          <p className="text-xs text-gray-500">{messages.length} mensajes</p>
        </div>
        {isPending && (
          <span className="text-xs text-gray-600">Enviando…</span>
        )}
      </div>

      {/* Escalated banner */}
      {escalated && (
        <div className="mx-4 mt-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400">
            Este lead está escalado a atención humana. El agente IA no responderá.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-600 py-10">Sin mensajes todavía</p>
        ) : (
          messages.map(msg => {
            const isOut = msg.direction === 'outbound'
            const isAgent = msg.sender === 'agent'
            return (
              <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                    !isOut
                      ? 'bg-gray-700 text-white rounded-tl-sm'
                      : isAgent
                      ? 'bg-[#7C3AED]/25 text-white rounded-tr-sm'
                      : 'bg-[#7C3AED] text-white rounded-tr-sm'
                  }`}
                >
                  {isOut && (
                    <p className="text-xs font-semibold mb-1 opacity-60">
                      {isAgent ? 'IA' : 'Tú'}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className="text-xs mt-1.5 opacity-40">
                    {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Escribe un mensaje manual…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="w-7 h-7 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
