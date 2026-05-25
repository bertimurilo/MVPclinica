'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { Lead, LeadStatus, LeadQualification } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils'

const FILTER_TABS = [
  { key: 'all',           label: 'Todos' },
  { key: 'nuevo',         label: 'Nuevo' },
  { key: 'contactado',    label: 'Contactado' },
  { key: 'cita_agendada', label: 'Cita agendada' },
  { key: 'convertido',    label: 'Convertido' },
]

const STATUS_MAP: Record<LeadStatus, { label: string; cls: string }> = {
  nuevo:         { label: 'Nuevo',         cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  contactado:    { label: 'Contactado',    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  cita_agendada: { label: 'Cita agendada', cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  convertido:    { label: 'Convertido',    cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  inactivo:      { label: 'Inactivo',      cls: 'bg-white/5 text-gray-500 border-white/10' },
  perdido:       { label: 'Perdido',       cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const QUALIF_MAP: Record<LeadQualification, { label: string; cls: string }> = {
  frio:     { label: 'Frío',     cls: 'text-blue-400' },
  tibio:    { label: 'Tibio',    cls: 'text-amber-400' },
  caliente: { label: 'Caliente', cls: 'text-orange-400' },
}

interface LeadsClientProps {
  leads: Lead[]
  currentSearch: string
  currentStatus: string
}

export function LeadsClient({ leads, currentSearch, currentStatus }: LeadsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(currentSearch)
  const [isPending, startTransition] = useTransition()
  const isFirstRender = useRef(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (currentStatus && currentStatus !== 'all') params.set('status', currentStatus)
      startTransition(() => { router.push(`${pathname}?${params.toString()}`) })
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function setStatus(status: string) {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (status !== 'all') params.set('status', status)
    startTransition(() => { router.push(`${pathname}?${params.toString()}`) })
  }

  const activeStatus = currentStatus || 'all'

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full text-white rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-gray-700 outline-none transition-all focus:ring-1 focus:ring-violet-500/40"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
              activeStatus === tab.key
                ? 'bg-violet-500/[0.14] text-violet-300 border-violet-500/30'
                : 'text-gray-600 hover:text-gray-300 border-transparent hover:bg-white/[0.05]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className={`rounded-xl overflow-hidden transition-opacity ${isPending ? 'opacity-50' : ''}`}
          style={{
            background: 'linear-gradient(150deg, #0e1628 0%, #0b1020 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderTop: '1px solid rgba(124,58,237,0.22)',
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Contacto</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Tratamiento</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Score</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Último contacto</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const status = STATUS_MAP[lead.status] ?? STATUS_MAP.inactivo
                const qualif = QUALIF_MAP[lead.qualification] ?? QUALIF_MAP.frio
                const initial = (lead.name ?? lead.phone).charAt(0).toUpperCase()

                return (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all group-hover:ring-1 group-hover:ring-violet-500/30"
                          style={{ background: 'rgba(124,58,237,0.16)', border: '1px solid rgba(124,58,237,0.28)', color: '#a78bfa' }}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate tracking-[-0.01em]">{lead.name ?? 'Sin nombre'}</p>
                          <p className="text-[11px] text-gray-600">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <p className="text-sm text-gray-500 truncate max-w-[160px]">
                        {lead.treatment_interest ?? <span className="text-gray-700">—</span>}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1 rounded-full overflow-hidden" style={{ width: 52, background: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${lead.score}%`,
                              background: 'linear-gradient(90deg, rgba(124,58,237,0.7), rgba(124,58,237,1))',
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-600 tabular-nums">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-gray-600">
                          {lead.last_message_at ? formatRelativeTime(lead.last_message_at) : '—'}
                        </p>
                        <p className={`text-[11px] font-medium ${qualif.cls}`}>{qualif.label}</p>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center rounded-xl"
      style={{
        background: 'linear-gradient(150deg, #0e1628 0%, #0b1020 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-400 tracking-[-0.01em]">No hay leads todavía</p>
      <p className="text-[11px] text-gray-700 mt-1">
        Cuando alguien escriba por WhatsApp aparecerá aquí.
      </p>
    </div>
  )
}
