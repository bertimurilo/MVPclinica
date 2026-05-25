'use client'

import { useState, useTransition } from 'react'
import { updateAppointmentStatus } from '@/lib/actions'
import type { Appointment } from '@/lib/types'

interface AppointmentPanelProps {
  appointments: Appointment[]
  clinicId: string
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

export function AppointmentPanel({ appointments, clinicId }: AppointmentPanelProps) {
  if (appointments.length === 0) return null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
      <p className="text-sm font-semibold text-white">
        Citas
        <span className="ml-2 text-xs font-normal text-gray-500">({appointments.length})</span>
      </p>
      {appointments.map(appt => (
        <AppointmentCard key={appt.id} appt={appt} clinicId={clinicId} />
      ))}
    </div>
  )
}
