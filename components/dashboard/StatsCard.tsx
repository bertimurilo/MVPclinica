import { type ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
}

const deltaStyle = {
  up:      { bg: 'rgba(16,185,129,0.14)',  color: '#34d399', arrow: '↑' },
  down:    { bg: 'rgba(239,68,68,0.14)',   color: '#f87171', arrow: '↓' },
  neutral: { bg: 'rgba(255,255,255,0.06)', color: '#6b7280', arrow: '→' },
}

export function StatsCard({ title, value, change, trend = 'neutral', icon }: StatsCardProps) {
  const d = deltaStyle[trend]

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-1"
      style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </p>
        {icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white tracking-tight leading-none">
        {value}
      </p>
      {change && (
        <span
          className="self-start inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-2"
          style={{ background: d.bg, color: d.color }}
        >
          {d.arrow} {change}
        </span>
      )}
    </div>
  )
}
