'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':     { title: 'Dashboard',                subtitle: 'Resumen de actividad' },
  '/leads':         { title: 'Pipeline',                  subtitle: 'Gestión de contactos' },
  '/inbox':         { title: 'Inbox',                     subtitle: 'Conversaciones activas' },
  '/conversations': { title: 'Conversaciones',            subtitle: 'Historial de mensajes' },
  '/appointments':  { title: 'Citas',                     subtitle: 'Agenda de la clínica' },
  '/agent-config':  { title: 'Configuración del Agente',  subtitle: 'Personaliza el agente IA' },
  '/settings':      { title: 'Ajustes',                   subtitle: 'Configuración de la clínica' },
}

export default function Header() {
  const pathname = usePathname()

  const matched = Object.entries(pageTitles).find(
    ([path]) => pathname === path || pathname.startsWith(path + '/')
  )
  const page = matched?.[1] ?? { title: 'Cliniq AI', subtitle: '' }

  return (
    <header
      className="h-14 px-6 flex items-center justify-between shrink-0"
      style={{ background: '#080f1e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div>
        <h1 className="text-sm font-semibold text-white leading-none">{page.title}</h1>
        {page.subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{page.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
          aria-label="Notificaciones"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)' }}>
          <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>C</span>
        </div>
      </div>
    </header>
  )
}
