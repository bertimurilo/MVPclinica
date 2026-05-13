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
  cita_agendada: { label: 'Cita agendada', cls: 'bg-emerald-500/10 text-purple-400 border-emerald-500/20' },
  convertido:    { label: 'Convertido',    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  inactivo:      { label: 'Inactivo',      cls: 'bg-gray-700/50 text-gray-500 border-gray-700' },
  perdido:       { label: 'Perdido',       cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const QUALIF_MAP: Record<LeadQualification, { label: string; cls: string }> = {
  frio:     { label: 'Frío',     cls: 'text-blue-400' },
  tibio:    { label: 'Tibio',    cls: 'text-amber-400' },
  caliente: { label: 'Caliente', cls: 'text-emerald-500' },
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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only search triggers debounce; status/pathname changes use direct push
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
      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre o teléfono..."
        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
      />

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
              activeStatus === tab.key
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border-transparent'
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
        <div className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Tratamiento</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Score</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Último contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {leads.map(lead => {
                const status = STATUS_MAP[lead.status] ?? STATUS_MAP.inactivo
                const qualif = QUALIF_MAP[lead.qualification] ?? QUALIF_MAP.frio
                const initial = (lead.name ?? lead.phone).charAt(0).toUpperCase()

                return (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{lead.name ?? 'Sin nombre'}</p>
                          <p className="text-xs text-gray-500">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <p className="text-sm text-gray-400 truncate max-w-[160px]">
                        {lead.treatment_interest ?? '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden" style={{ width: 56 }}>
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${lead.score}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-6">{lead.score}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-xs text-gray-500">
                          {lead.last_message_at ? formatRelativeTime(lead.last_message_at) : '—'}
                        </p>
                        <p className={`text-xs font-medium ${qualif.cls}`}>{qualif.label}</p>
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
    <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-800 border border-gray-700 rounded-xl">
      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-400">No hay leads todavía</p>
      <p className="text-xs text-gray-600 mt-1">
        Cuando alguien escriba por WhatsApp aparecerá aquí.
      </p>
    </div>
  )
}
