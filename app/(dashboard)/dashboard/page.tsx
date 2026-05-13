import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { getCurrentClinicId, getDashboardStats, getRecentLeads, getLeadsDistribution } from '@/lib/actions'
import { formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

const QUALIF_COLOR: Record<string, string> = {
  frio:     'text-blue-400',
  tibio:    'text-amber-400',
  caliente: 'text-emerald-500',
}

const QUALIF_LABEL: Record<string, string> = {
  frio:     'Frío',
  tibio:    'Tibio',
  caliente: 'Caliente',
}

const DIST_CONFIG = [
  { key: 'nuevo',         label: 'Nuevos',        color: 'bg-blue-500' },
  { key: 'contactado',    label: 'Contactados',   color: 'bg-amber-500' },
  { key: 'cita_agendada', label: 'Cita agendada', color: 'bg-emerald-500' },
  { key: 'convertido',    label: 'Convertidos',   color: 'bg-emerald-500' },
  { key: 'perdido',       label: 'Perdidos',      color: 'bg-gray-600' },
]

export default async function DashboardPage() {
  let clinicId: string
  try {
    clinicId = await getCurrentClinicId()
  } catch {
    redirect('/login')
  }

  const [stats, recentLeads, distribution] = await Promise.all([
    getDashboardStats(clinicId),
    getRecentLeads(clinicId),
    getLeadsDistribution(clinicId),
  ])

  const leadsHoyDelta = stats.leads_hoy - stats.leads_hoy_ayer
  const citasDelta = stats.citas_semana - stats.citas_semana_pasada
  const totalLeads = Object.values(distribution).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h2 className="text-lg font-semibold text-white">Resumen</h2>
        <p className="text-sm text-gray-500 mt-0.5">Aquí tienes el resumen de hoy</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Leads hoy"
          value={stats.leads_hoy}
          change={
            leadsHoyDelta === 0
              ? 'igual que ayer'
              : `${leadsHoyDelta > 0 ? '+' : ''}${leadsHoyDelta} vs ayer`
          }
          trend={leadsHoyDelta > 0 ? 'up' : leadsHoyDelta < 0 ? 'down' : 'neutral'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatsCard
          title="Leads activos"
          value={stats.leads_activos}
          change="en seguimiento"
          trend="neutral"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <StatsCard
          title="Citas esta semana"
          value={stats.citas_semana}
          change={
            citasDelta === 0
              ? 'igual sem. pasada'
              : `${citasDelta > 0 ? '+' : ''}${citasDelta} vs sem. pasada`
          }
          trend={citasDelta > 0 ? 'up' : citasDelta < 0 ? 'down' : 'neutral'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <StatsCard
          title="Tasa de conversión"
          value={`${stats.tasa_conversion}%`}
          change="últimos 30 días"
          trend="neutral"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      {/* Recent leads + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent leads */}
        <div className="lg:col-span-3 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Leads recientes</h3>
            <Link href="/leads" className="text-xs text-emerald-500 hover:text-purple-400 transition-colors">
              Ver todos →
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500">Aún no hay leads.</p>
              <p className="text-xs text-gray-600 mt-1">
                Cuando alguien escriba por WhatsApp aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {recentLeads.map((lead) => {
                const l = lead as {
                  id: string
                  name?: string | null
                  phone: string
                  qualification: string
                  last_message_at?: string | null
                  last_message?: string | null
                }
                const initial = (l.name ?? l.phone).charAt(0).toUpperCase()
                return (
                  <Link
                    key={l.id}
                    href={`/leads/${l.id}`}
                    className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-700/50 transition-colors block"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {l.name ?? l.phone}
                      </p>
                      {l.last_message && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {l.last_message.slice(0, 60)}
                          {l.last_message.length > 60 ? '…' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-medium ${QUALIF_COLOR[l.qualification] ?? 'text-gray-500'}`}>
                        {QUALIF_LABEL[l.qualification] ?? l.qualification}
                      </span>
                      {l.last_message_at && (
                        <span className="text-xs text-gray-600">
                          {formatRelativeTime(l.last_message_at)}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Status distribution */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Distribución de leads</h3>

          {totalLeads === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">Sin datos todavía</p>
          ) : (
            <div className="space-y-3">
              {DIST_CONFIG.map(item => {
                const count = distribution[item.key] ?? 0
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
