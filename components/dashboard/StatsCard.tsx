import { type ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
}

const deltaStyle = {
  up:      { bg: 'rgba(16,185,129,0.15)', color: '#34d399', arrow: '↑' },
  down:    { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', arrow: '↓' },
  neutral: { bg: 'rgba(75,85,99,0.40)',   color: '#9ca3af', arrow: '→' },
}

export function StatsCard({ title, value, change, trend = 'neutral' }: StatsCardProps) {
  const d = deltaStyle[trend]

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1"
      style={{ background: '#111827', border: '1px solid #1f2937' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
        {title}
      </p>
      <p className="text-4xl font-bold text-white tracking-tight leading-none mt-1">
        {value}
      </p>
      {change && (
        <span
          className="self-start inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-2"
          style={{ background: d.bg, color: d.color }}
        >
          {d.arrow} {change}
        </span>
      )}
    </div>
  )
}
