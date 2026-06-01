'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateAppointmentStatus, createAppointment } from '@/lib/actions'
import type { Appointment } from '@/lib/types'

interface Treatment {
  id: string
  name: string
  price: number
  duration_minutes: number
}

interface AppointmentPanelProps {
  appointments: Appointment[]
  clinicId: string
  leadId: string
  treatments: Treatment[]
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  agendada:   { label: 'Agendada',   cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  confirmada: { label: 'Confirmada', cls: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  completada: { label: 'Completada', cls: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  cancelada:  { label: 'Cancelada',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  no_show:    { label: 'No asistió', cls: 'bg-gray-600/20 text-gray-400 border border-gray-600/30' },
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return 'Fecha por confirmar'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AppointmentCard({ appt, clinicId }: { appt: Appointment; clinicId: string }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(appt.status)

  const style = STATUS_STYLES[status] ?? STATUS_STYLES.agendada
  const needsConfirmation = appt.requires_human_confirmation && status === 'agendada'

  function handleAction(newStatus: 'confirmada' | 'cancelada') {
    setStatus(newStatus)
    startTransition(async () => {
      await updateAppointmentStatus(appt.id, clinicId, newStatus)
    })
  }

  return (
    <div className="rounded-lg bg-gray-900 border border-gray-700 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-medium text-white truncate">
            {appt.treatment?.name ?? 'Tratamiento no especificado'}
          </p>
          <p className="text-xs text-gray-500">{formatDateTime(appt.appointment_date)}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${style.cls}`}>
          {style.label}
        </span>
      </div>

      {appt.notes && (
        <p className="text-xs text-gray-500 italic leading-relaxed">{appt.notes}</p>
      )}

      {needsConfirmation && (
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={() => handleAction('confirmada')}
            disabled={isPending}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
          <button
            onClick={() => handleAction('cancelada')}
            disabled={isPending}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

function NewAppointmentForm({
  leadId,
  clinicId,
  treatments,
  onClose,
}: {
  leadId: string
  clinicId: string
  treatments: Treatment[]
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [treatmentId, setTreatmentId] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await createAppointment(leadId, clinicId, {
        treatment_id: treatmentId || undefined,
        appointment_date: date || undefined,
        notes: notes || undefined,
      })
      router.refresh()
      onClose()
    })
  }

  const inputCls = 'w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 placeholder-gray-600'

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-gray-900 border border-gray-700 p-4 space-y-3">
      <p className="text-xs font-semibold text-white">Nueva cita</p>

      {/* Treatment */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Tratamiento</label>
        <select
          value={treatmentId}
          onChange={e => setTreatmentId(e.target.value)}
          className={inputCls}
        >
          <option value="">Sin especificar</option>
          {treatments.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Date + time */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Fecha y hora</label>
        <input
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notas</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Observaciones opcionales..."
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="flex gap-2 pt-0.5">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Guardando…' : 'Guardar cita'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function AppointmentPanel({ appointments, clinicId, leadId, treatments }: AppointmentPanelProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          Citas
          {appointments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">({appointments.length})</span>
          )}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            + Nueva
          </button>
        )}
      </div>

      {showForm && (
        <NewAppointmentForm
          leadId={leadId}
          clinicId={clinicId}
          treatments={treatments}
          onClose={() => setShowForm(false)}
        />
      )}

      {appointments.map(appt => (
        <AppointmentCard key={appt.id} appt={appt} clinicId={clinicId} />
      ))}

      {appointments.length === 0 && !showForm && (
        <p className="text-xs text-gray-600">Sin citas registradas</p>
      )}
    </div>
  )
}
