'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { getLead, sendHumanMessage } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Lead, Message } from '@/lib/types'

interface InboxClientProps {
  clinicId: string
  initialLeads: Lead[]
}

export function InboxClient({ clinicId, initialLeads }: InboxClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedLeadIdRef = useRef<string | null>(null)
  selectedLeadIdRef.current = selectedLeadId

  useEffect(() => {
    if (!selectedLeadId) return
    setLoadingMessages(true)
    setMessages([])
    getLead(selectedLeadId, clinicId).then(result => {
      if (result) setMessages(result.messages)
      setLoadingMessages(false)
    })
  }, [selectedLeadId, clinicId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('inbox-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.lead_id === selectedLeadIdRef.current) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
          setLeads(prev => {
            const existing = prev.find(l => l.id === newMsg.lead_id)
            if (!existing) return prev
            const updated: Lead = { ...existing, last_message_at: newMsg.created_at }
            return [updated, ...prev.filter(l => l.id !== newMsg.lead_id)]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clinicId])

  function handleSend() {
    const content = input.trim()
    if (!content || !selectedLeadId || isPending) return
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      lead_id: selectedLeadId,
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
      await sendHumanMessage(selectedLeadId, clinicId, content)
      const result = await getLead(selectedLeadId, clinicId)
      if (result) setMessages(result.messages)
    })
  }

  const selectedLeadData = leads.find(l => l.id === selectedLeadId)

  return (
    <div className="h-[calc(100vh-8.5rem)] bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex">

      {/* Left panel — conversation list */}
      <div className="w-72 shrink-0 border-r border-gray-700 flex flex-col">
        <div className="px-4 py-3.5 border-b border-gray-700">
          <p className="text-sm font-semibold text-white">Inbox</p>
          <p className="text-xs text-gray-500 mt-0.5">{leads.length} conversaciones</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-700/50">
          {leads.length === 0 ? (
            <p className="px-4 py-10 text-xs text-gray-600 text-center">
              Sin conversaciones todavía
            </p>
          ) : (
            leads.map(lead => {
              const initial = (lead.name ?? lead.phone).charAt(0).toUpperCase()
              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full px-4 py-3.5 text-left hover:bg-gray-700/50 transition-colors ${
                    selectedLeadId === lead.id ? 'bg-gray-700/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-500 shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-medium text-white truncate">
                          {lead.name ?? lead.phone}
                        </p>
                        {lead.last_message_at && (
                          <span className="text-xs text-gray-600 shrink-0">
                            {formatRelativeTime(lead.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-xs text-gray-500 truncate">
                          {lead.treatment_interest ?? '—'}
                        </p>
                        {lead.escalated && (
                          <span className="shrink-0 px-1.5 py-0.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                            Humano
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel — thread */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!selectedLeadId ? (
          <EmptySelect />
        ) : loadingMessages ? (
          <LoadingMessages />
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-500 shrink-0">
                  {(selectedLeadData?.name ?? selectedLeadData?.phone ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedLeadData?.name ?? selectedLeadData?.phone ?? '—'}
                  </p>
                  <p className="text-xs text-gray-500">{selectedLeadData?.phone}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">{messages.length} mensajes</p>
            </div>

            {/* Escalated banner */}
            {selectedLeadData?.escalated && (
              <div className="mx-4 mt-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg shrink-0">
                <p className="text-xs text-amber-400">
                  Atención humana activa — el agente no responderá.
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
                            ? 'bg-emerald-500/25 text-white rounded-tr-sm'
                            : 'bg-emerald-500 text-white rounded-tr-sm'
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
            <div className="px-5 py-4 border-t border-gray-700 shrink-0">
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
                  className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}

function EmptySelect() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-400">Selecciona una conversación</p>
        <p className="text-xs text-gray-600 mt-1">Los mensajes aparecerán aquí</p>
      </div>
    </div>
  )
}

function LoadingMessages() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-gray-600">Cargando mensajes…</p>
    </div>
  )
}
