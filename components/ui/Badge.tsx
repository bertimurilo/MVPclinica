import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'violet' | 'blue' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variants: Record<BadgeVariant, string> = {
  violet: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  blue:    'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  yellow:  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  red:     'bg-red-500/10 text-red-400 border border-red-500/20',
  purple:  'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  orange:  'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  gray:    'bg-gray-700 text-gray-400 border border-gray-600',
}

const dotColors: Record<BadgeVariant, string> = {
  violet: 'bg-violet-400',
  blue:    'bg-blue-400',
  yellow:  'bg-yellow-400',
  red:     'bg-red-400',
  purple:  'bg-purple-400',
  orange:  'bg-orange-400',
  gray:    'bg-gray-400',
}

export function Badge({ variant = 'gray', dot, children, className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}
