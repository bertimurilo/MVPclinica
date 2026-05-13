'use client'

import { useState, useTransition } from 'react'
import { updateLeadStatus, escalateLead, saveLeadNote } from '@/lib/actions'
import type { LeadStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'nuevo',         label: 'Nuevo' },
  { value: 'contactado',    label: 'Contactado' },
  { value: 'cita_agendada', label: 'Cita agendada' },
  { value: 'convertido',    label: 'Convertido' },
  { value: 'inactivo',      label: 'Inactivo' },
  { value: 'perdido',       label: 'Perdido' },
]

interface LeadSidebarActionsProps {
  leadId: string
  clinicId: string
  status: LeadStatus
  escalated: boolean
  notes?: string | null
}

export function LeadSidebarActions({
  leadId,
  clinicId,
  status: initialStatus,
  escalated: initialEscalated,
  notes: initialNotes,
}: LeadSidebarActionsProps) {
  const [status, setStatus] = useState(initialStatus)
  const [escalated, setEscalated] = useState(initialEscalated)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus as LeadStatus)
    startTransition(async () => {
      await updateLeadStatus(leadId, clinicId, newStatus as LeadStatus)
    })
  }

  function handleEscalate() {
    setEscalated(true)
    startTransition(async () => {
      await escalateLead(leadId, clinicId)
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      const result = await saveLeadNote(leadId, clinicId, notes)
      if (result?.error) {
        setNotesStatus('error')
      } else {
        setNotesStatus('saved')
      }
      setTimeout(() => setNotesStatus('idle'), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Status selector */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Estado</label>
        <select
          value={status}
          onChange={e => handleStatusChange(e.target.value)}
          disabled={isPending}
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all disabled:opacity-50"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Notas internas</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Añade notas sobre este lead..."
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
        />
        <button
          onClick={handleSaveNotes}
          disabled={isPending}
          className={`mt-1 text-xs transition-colors disabled:opacity-40 ${
            notesStatus === 'saved' ? 'text-emerald-400' :
            notesStatus === 'error' ? 'text-red-400' :
            'text-emerald-500 hover:text-purple-400'
          }`}
        >
          {notesStatus === 'saved' ? '✓ Guardado' : notesStatus === 'error' ? 'Error al guardar' : 'Guardar nota'}
        </button>
      </div>

      {/* Escalate */}
      {escalated ? (
        <div className="px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400 font-medium">Escalado a atención humana</p>
          <p className="text-xs text-amber-500/70 mt-0.5">El agente IA no responderá</p>
        </div>
      ) : (
        <button
          onClick={handleEscalate}
          disabled={isPending}
          className="w-full px-3 py-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50"
        >
          Escalar a humano
        </button>
      )}
    </div>
  )
}
