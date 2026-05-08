import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: ReactNode
}

const trendConfig = {
  up:      { color: 'text-emerald-400', icon: '↑' },
  down:    { color: 'text-red-400',     icon: '↓' },
  neutral: { color: 'text-gray-500',    icon: '→' },
}

export function StatsCard({ title, value, change, trend = 'neutral', icon }: StatsCardProps) {
  const { color, icon: arrow } = trendConfig[trend]

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
          {icon}
        </div>
        {change && (
          <span className={cn('text-xs font-medium flex items-center gap-0.5', color)}>
            {arrow} {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-sm text-gray-400 mt-1.5">{title}</p>
    </div>
  )
}
