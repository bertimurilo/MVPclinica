'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import VenuIcon from '@/components/ui/VenuIcon'

interface NavItem {
  href: string
  label: string
  badge?: number
  isActive: (p: string) => boolean
  icon: React.ReactNode
}

const makeNav = (): NavItem[] => [
  {
    href: '/dashboard',
    label: 'Dashboard',
    isActive: (p) => p === '/dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: '/inbox',
    label: 'Inbox',
    isActive: (p) => p.startsWith('/inbox'),
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'Pipeline',
    isActive: (p) => p.startsWith('/leads'),
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    href: '/appointments',
    label: 'Citas',
    isActive: (p) => p.startsWith('/appointments'),
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
]

interface SidebarProps {
  clinicName: string
  leadsCount?: number
}

export default function Sidebar({ clinicName, leadsCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navItems = makeNav()

  navItems[2].badge = leadsCount || undefined

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="w-56 shrink-0 h-screen flex flex-col relative"
      style={{
        background: 'linear-gradient(180deg, #080f1e 0%, #060c18 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Brand */}
      <div
        className="px-4 pt-5 pb-4 relative overflow-hidden"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Subtle violet glow behind logo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(60% 80% at 30% 50%, rgba(124,58,237,0.08), transparent)' }}
        />
        <div className="flex items-center gap-2.5 relative">
          <VenuIcon size={28} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-none tracking-[-0.01em]">Venu</p>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">{clinicName}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          Principal
        </p>

        <div className="space-y-0.5">
          {navItems.map((item, i) => {
            const active = item.isActive(pathname)
            return (
              <Link
                key={`${item.href}-${i}`}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'text-violet-200 bg-violet-500/[0.13]'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.05]'
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-violet-500 rounded-r-full shadow-[0_0_6px_rgba(124,58,237,0.7)]" />
                )}
                <span className={cn('shrink-0 transition-colors', active ? 'text-violet-400' : 'text-gray-600')}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{
                      background: active ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)',
                      color: active ? '#c4b5fd' : '#6b7280',
                    }}
                  >
                    {item.badge > 999 ? '999+' : item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>

        <div className="mx-2 my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

        <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          Configuración
        </p>

        <div className="space-y-0.5">
          {[
            {
              href: '/settings',
              label: 'Ajustes',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              ),
            },
            {
              href: '/billing',
              label: 'Facturación',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              ),
            },
          ].map(({ href, label, icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'text-violet-200 bg-violet-500/[0.13]'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.05]'
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-violet-500 rounded-r-full shadow-[0_0_6px_rgba(124,58,237,0.7)]" />
                )}
                <span className={cn('shrink-0 transition-colors', active ? 'text-violet-400' : 'text-gray-600')}>
                  {icon}
                </span>
                <span className="flex-1">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all text-gray-600 hover:text-gray-300 hover:bg-white/[0.05]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
