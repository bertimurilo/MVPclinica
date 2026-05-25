import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { AppointmentsChart } from '@/components/dashboard/AppointmentsChart'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  getCurrentClinicId,
  getDashboardStats,
  getRecentLeads,
  getLeadsDistribution,
  getEstimatedRevenue,
  getAppointmentsByDay,
} from '@/lib/actions'
import { formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

const QUALIF_COLOR: Record<string, string> = {
  frio:     'text-blue-400',
  tibio:    'text-amber-400',
  caliente: 'text-violet-400',
}

const QUALIF_LABEL: Record<string, string> = {
  frio:     'Frío',
  tibio:    'Tibio',
  caliente: 'Caliente',
}

const DIST_CONFIG = [
  { key: 'nuevo',         label: 'Nuevos',        color: 'bg-blue-500' },
  { key: 'contactado',    label: 'Contactados',   color: 'bg-amber-500' },
  { key: 'cita_agendada', label: 'Cita agendada', color: 'bg-violet-500' },
  { key: 'convertido',    label: 'Convertidos',   color: 'bg-violet-400' },
  { key: 'perdido',       label: 'Perdidos',      color: 'bg-gray-600' },
]

const PIPELINE_COLS = [
  { key: 'nuevo',         label: 'Nuevos',        dot: 'bg-blue-500',    glow: 'rgba(59,130,246,0.5)' },
  { key: 'contactado',    label: 'Contactados',   dot: 'bg-amber-500',   glow: 'rgba(245,158,11,0.5)' },
  { key: 'cita_agendada', label: 'Cita agendada', dot: 'bg-violet-500',  glow: 'rgba(124,58,237,0.5)' },
  { key: 'convertido',    label: 'Convertidos',   dot: 'bg-violet-400',  glow: 'rgba(167,139,250,0.4)' },
]

function formatRevenue(total: number) {
  if (total >= 1000) return `€${(total / 1000).toFixed(1)}k`
  return `€${total}`
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
}

const CARD_STYLE = {
  background: 'linear-gradient(150deg, #0e1628 0%, #0b1020 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
} as const

const CARD_TOP_ACCENT = {
  ...CARD_STYLE,
  borderTop: '1px solid rgba(124,58,237,0.28)',
} as const

export default async function DashboardPage() {
  let clinicId: string
  try {
    clinicId = await getCurrentClinicId()
  } catch {
    redirect('/login')
  }

  const [stats, recentLeads, distribution, revenue, appointmentsByDay] = await Promise.all([
    getDashboardStats(clinicId),
    getRecentLeads(clinicId),
    getLeadsDistribution(clinicId),
    getEstimatedRevenue(clinicId),
    getAppointmentsByDay(clinicId),
  ])

  const citasDelta = stats.citas_semana - stats.citas_semana_pasada
  const totalLeads = Object.values(distribution).reduce((a, b) => a + b, 0)

  type RecentLead = {
    id: string; name?: string | null; phone: string
    qualification: string; last_message_at?: string | null
    last_message?: string | null; status: string
    treatment_interest?: string | null
  }
  const pipelineByStatus: Record<string, RecentLead[]> = {}
  for (const lead of recentLeads as RecentLead[]) {
    if (!pipelineByStatus[lead.status]) pipelineByStatus[lead.status] = []
    if (pipelineByStatus[lead.status].length < 2) {
      pipelineByStatus[lead.status].push(lead)
    }
  }

  return (
    <ErrorBoundary>
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-600 mb-1">
            {getGreeting()}
          </p>
          <h2 className="text-lg font-semibold text-white tracking-[-0.02em] leading-none">
            Resumen del día
          </h2>
          <p className="text-xs text-gray-600 mt-1 capitalize">{formatDate()}</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatsCard
          title="Ingresos estimados"
          value={formatRevenue(revenue.total)}
          change={`${revenue.count} cita${revenue.count !== 1 ? 's' : ''} confirmada${revenue.count !== 1 ? 's' : ''}`}
          trend={revenue.total > 0 ? 'up' : 'neutral'}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatsCard
          title="Tiempo de respuesta"
          value="12s"
          change="avg. últimos 30 días"
          trend="up"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {/* Appointments chart */}
      <div className="rounded-xl p-5" style={CARD_TOP_ACCENT}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">Citas en el tiempo</h3>
            <p className="text-[11px] text-gray-600 mt-0.5">últimos 30 días</p>
          </div>
        </div>
        <AppointmentsChart data={appointmentsByDay} />
      </div>

      {/* Recent leads + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5">

        {/* Recent leads */}
        <div className="lg:col-span-3 rounded-xl overflow-hidden" style={CARD_STYLE}>
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">Leads recientes</h3>
            <Link
              href="/leads"
              className="text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              Ver todos
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
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
            <div>
              {(recentLeads as RecentLead[]).map((l) => {
                const initial = (l.name ?? l.phone).charAt(0).toUpperCase()
                return (
                  <Link
                    key={l.id}
                    href={`/leads/${l.id}`}
                    className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.025] transition-colors block"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.30)', color: '#a78bfa' }}
                    >
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate tracking-[-0.01em]">
                        {l.name ?? l.phone}
                      </p>
                      {l.last_message && (
                        <p className="text-xs text-gray-600 truncate mt-0.5">
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
                        <span className="text-[11px] text-gray-700">
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
        <div className="lg:col-span-2 rounded-xl p-5" style={CARD_STYLE}>
          <h3 className="text-sm font-semibold text-white tracking-[-0.01em] mb-4">
            Distribución de leads
          </h3>

          {totalLeads === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">Sin datos todavía</p>
          ) : (
            <div className="space-y-3.5">
              {DIST_CONFIG.map(item => {
                const count = distribution[item.key] ?? 0
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-gray-600 tabular-nums font-medium">
                        {count} <span className="text-gray-700">· {pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-700`}
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

      {/* Pipeline esta semana */}
      <div className="rounded-xl overflow-hidden" style={CARD_STYLE}>
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">Pipeline esta semana</h3>
          <Link
            href="/leads"
            className="text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
          >
            Ver pipeline
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.04]">
          {PIPELINE_COLS.map(col => {
            const colLeads = pipelineByStatus[col.key] ?? []
            return (
              <div key={col.key} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${col.dot} shrink-0`}
                    style={{ boxShadow: `0 0 5px ${col.glow}` }}
                  />
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="ml-auto text-[10px] text-gray-700 tabular-nums font-medium">
                    {distribution[col.key] ?? 0}
                  </span>
                </div>
                {colLeads.length === 0 ? (
                  <p className="text-[11px] text-gray-700 py-2">Sin leads</p>
                ) : (
                  <div className="space-y-1.5">
                    {colLeads.map(l => (
                      <Link
                        key={l.id}
                        href={`/leads/${l.id}`}
                        className="block rounded-lg p-2.5 hover:bg-white/[0.05] transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <p className="text-xs font-medium text-white truncate tracking-[-0.01em]">
                          {l.name ?? l.phone}
                        </p>
                        {l.treatment_interest && (
                          <p className="text-[11px] text-gray-600 truncate mt-0.5">
                            {l.treatment_interest}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
    </ErrorBoundary>
  )
}
