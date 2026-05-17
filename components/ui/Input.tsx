import { type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        className={cn(
          'w-full bg-white/5 border text-white rounded-lg px-3.5 py-2.5 text-sm',
          'placeholder:text-gray-600 outline-none transition-all',
          'focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60',
          error
            ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500'
            : 'border-white/10',
          className
        )}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <textarea
        {...props}
        id={inputId}
        className={cn(
          'w-full bg-white/5 border text-white rounded-lg px-3.5 py-2.5 text-sm',
          'placeholder:text-gray-600 outline-none transition-all resize-none',
          'focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60',
          error ? 'border-red-500/60' : 'border-white/10',
          className
        )}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
