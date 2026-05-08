'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateAppointmentStatus } from '@/app/(dashboard)/appointments/actions'
import type { AppointmentStatus } from '@/lib/types'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type CalendarAppointment = {
  id: string
  appointment_date: string | null
  status: AppointmentStatus
  notes: string | null
  requires_human_confirmation: boolean | null
  lead: { name: string | null; phone: string } | null
  treatment: { name: string; price: number | null; duration_minutes: number | null } | null
}

type Props = {
  appointments: CalendarAppointment[]
  month: number
  year: number
}

const STATUS_PILL: Record<AppointmentStatus, string> = {
  agendada:   'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  confirmada: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  completada: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  cancelada:  'bg-red-500/20 text-red-400 border border-red-500/30',
  no_show:    'bg-red-500/20 text-red-400 border border-red-500/30',
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  agendada:   'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada:  'Cancelada',
  no_show:    'No asistió',
}

const STATUS_ACTIONS: { status: AppointmentStatus; label: string }[] = [
  { status: 'confirmada', label: 'Confirmar' },
  { status: 'completada', label: 'Completada' },
  { status: 'no_show',    label: 'No asistió' },
  { status: 'cancelada',  label: 'Cancelar' },
]

export function CalendarView({ appointments, month, year }: Props) {
  const router = useRouter()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  // Spanish calendar: Monday = col 0 → (getDay() + 6) % 7
  const startOffset = (firstDay.getDay() + 6) % 7

  type GridDay = { day: number; currentMonth: boolean }
  const grid: GridDay[] = []

  // Prev month filler
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    grid.push({ day: prevMonthDays - i, currentMonth: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ day: d, currentMonth: true })
  }
  // Next month filler to complete 6 rows
  const remaining = 42 - grid.length
  for (let i = 1; i <= remaining; i++) {
    grid.push({ day: i, currentMonth: false })
  }

  const dayAppointments = (day: number) =>
    appointments.filter(a => {
      if (!a.appointment_date) return false
      const d = new Date(a.appointment_date)
      return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year
    })

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() + 1 &&
    year === today.getFullYear()

  // Month navigation
  const goMonth = (delta: number) => {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setSelectedDay(null)
    router.push(`/appointments?month=${m}&year=${y}`)
  }

  const handleStatusChange = (id: string, status: AppointmentStatus) => {
    startTransition(async () => {
      await updateAppointmentStatus(id, status)
    })
  }

  const selectedAppointments = selectedDay ? dayAppointments(selectedDay) : []

  return (
    <div className="flex gap-6">
      {/* Calendar grid */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goMonth(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => goMonth(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-gray-700">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          <div className="grid grid-cols-7">
            {grid.map((cell, i) => {
              const appts = cell.currentMonth ? dayAppointments(cell.day) : []
              const isSelected = cell.currentMonth && selectedDay === cell.day

              return (
                <button
                  key={i}
                  onClick={() => cell.currentMonth && setSelectedDay(cell.day === selectedDay ? null : cell.day)}
                  className={`min-h-[90px] p-2 border-b border-r border-gray-700/50 text-left transition-colors ${
                    !cell.currentMonth ? 'opacity-30 cursor-default' :
                    isSelected ? 'bg-[#7C3AED]/10' :
                    'hover:bg-gray-700/40 cursor-pointer'
                  }`}
                >
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium mb-1.5 ${
                    isToday(cell.day) && cell.currentMonth
                      ? 'bg-[#7C3AED] text-white'
                      : cell.currentMonth
                        ? 'text-gray-300'
                        : 'text-gray-600'
                  }`}>
                    {cell.day}
                  </span>

                  <div className="space-y-0.5">
                    {appts.slice(0, 2).map(a => (
                      <div
                        key={a.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate border ${STATUS_PILL[a.status]}`}
                      >
                        {a.lead?.name ?? a.lead?.phone ?? '—'}
                      </div>
                    ))}
                    {appts.length > 2 && (
                      <p className="text-xs text-gray-500 pl-1">+{appts.length - 2} más</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Empty state */}
        {appointments.length === 0 && (
          <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-10 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 font-medium">No hay citas este mes</p>
            <p className="text-xs text-gray-600 mt-1">Las citas propuestas por el agente IA aparecerán aquí</p>
          </div>
        )}
      </div>

      {/* Day panel */}
      {selectedDay && (
        <div className="w-80 shrink-0">
          <h3 className="text-sm font-semibold text-white mb-3">
            {selectedDay} de {MONTH_NAMES[month - 1]}
          </h3>

          {selectedAppointments.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-500">Sin citas este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppointments.map(a => {
                const time = a.appointment_date
                  ? new Date(a.appointment_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                  : '—'

                return (
                  <div key={a.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
                    {/* Lead info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {a.lead?.name ?? 'Sin nombre'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.lead?.phone}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_PILL[a.status]} shrink-0`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>🕐 {time}</p>
                      {a.treatment && (
                        <p>💉 {a.treatment.name}{a.treatment.price != null ? ` · ${a.treatment.price}€` : ''}</p>
                      )}
                      {a.requires_human_confirmation && (
                        <p className="text-amber-400">⚠ Requiere confirmación</p>
                      )}
                      {a.notes && <p className="text-gray-600 truncate">📝 {a.notes}</p>}
                    </div>

                    {/* Status actions */}
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-700">
                      {STATUS_ACTIONS.filter(sa => sa.status !== a.status).map(sa => (
                        <button
                          key={sa.status}
                          onClick={() => handleStatusChange(a.id, sa.status)}
                          disabled={isPending}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                            sa.status === 'cancelada' || sa.status === 'no_show'
                              ? 'border-gray-700 text-gray-400 hover:border-red-500/40 hover:text-red-400'
                              : 'border-gray-700 text-gray-400 hover:border-[#7C3AED]/40 hover:text-[#8B5CF6]'
                          }`}
                        >
                          {sa.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
