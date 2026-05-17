import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:   'bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-900/40 focus-visible:ring-2 focus-visible:ring-violet-500/60',
  secondary: 'bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 hover:border-white/20 focus-visible:ring-2 focus-visible:ring-white/20',
  ghost:     'bg-transparent hover:bg-white/5 text-gray-400 hover:text-white focus-visible:ring-2 focus-visible:ring-white/20',
  danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 focus-visible:ring-2 focus-visible:ring-red-500/30',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all outline-none',
        'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  )
}
