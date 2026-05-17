import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, className, hover, padding = 'md', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-xl',
        hover && 'hover:border-violet-500/30 hover:bg-white/[0.03] transition-all duration-200 cursor-pointer',
        paddings[padding],
        className
      )}
      style={{
        background: '#0e1628',
        border: '1px solid rgba(255,255,255,0.07)',
        ...(props.style ?? {}),
      }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('px-5 py-4', className)}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', ...(props.style ?? {}) }}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('p-5', className)}>
      {children}
    </div>
  )
}
