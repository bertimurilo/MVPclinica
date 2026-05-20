import { type ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
}

const trendConfig = {
  up:      { bg: 'rgba(16,185,129,0.10)',   border: 'rgba(16,185,129,0.22)',  color: '#34d399', arrow: '↑' },
  down:    { bg: 'rgba(239,68,68,0.10)',    border: 'rgba(239,68,68,0.22)',   color: '#f87171', arrow: '↓' },
  neutral: { bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.09)', color: '#6b7280', arrow: '→' },
}

export function StatsCard({ title, value, change, trend = 'neutral', icon }: StatsCardProps) {
  const t = trendConfig[trend]

  return (
    <div
      className="rounded-xl p-5 flex flex-col relative overflow-hidden group cursor-default"
      style={{
        background: 'linear-gradient(150deg, #0e1628 0%, #0b1020 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: '1px solid rgba(124,58,237,0.32)',
      }}
    >
      {/* Top-right hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(55% 55% at 100% 0%, rgba(124,58,237,0.09), transparent)' }}
      />

      <div className="flex items-start justify-between mb-3 relative">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 leading-none pt-0.5">
          {title}
        </p>
        {icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.28)',
              color: '#a78bfa',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <p className="text-[2rem] font-bold text-white tracking-tight leading-none relative">
        {value}
      </p>

      {change && (
        <span
          className="self-start inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-3 relative"
          style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.color }}
        >
          {t.arrow} {change}
        </span>
      )}
    </div>
  )
}
