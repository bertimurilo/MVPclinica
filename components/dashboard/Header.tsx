'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':     { title: 'Dashboard',               subtitle: 'Resumen de actividad' },
  '/leads':         { title: 'Pipeline',                 subtitle: 'Gestión de contactos' },
  '/inbox':         { title: 'Inbox',                    subtitle: 'Conversaciones activas' },
  '/conversations': { title: 'Conversaciones',           subtitle: 'Historial de mensajes' },
  '/appointments':  { title: 'Citas',                    subtitle: 'Agenda de la clínica' },
  '/agent-config':  { title: 'Config. del Agente',       subtitle: 'Personaliza el agente IA' },
  '/settings':      { title: 'Ajustes',                  subtitle: 'Configuración de la clínica' },
}

export default function Header() {
  const pathname = usePathname()

  const matched = Object.entries(pageTitles).find(
    ([path]) => pathname === path || pathname.startsWith(path + '/')
  )
  const page = matched?.[1] ?? { title: 'Venu', subtitle: '' }

  return (
    <header
      className="h-14 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20"
      style={{
        background: 'rgba(3,7,18,0.80)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div>
        <h1 className="text-sm font-semibold text-white leading-none tracking-[-0.01em]">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-[11px] text-gray-600 mt-[3px] leading-none">{page.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all text-gray-600 hover:text-gray-300 hover:bg-white/[0.06]"
          aria-label="Notificaciones"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <div
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all hover:ring-2 hover:ring-violet-500/30 hover:ring-offset-1 hover:ring-offset-[#030712]"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.32) 0%, rgba(109,40,217,0.44) 100%)',
            border: '1px solid rgba(124,58,237,0.45)',
          }}
        >
          <span className="text-[11px] font-bold" style={{ color: '#c4b5fd' }}>C</span>
        </div>
      </div>
    </header>
  )
}
