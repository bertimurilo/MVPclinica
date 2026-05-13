'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    href: '/inbox',
    label: 'Inbox',
    isActive: (p) => p.startsWith('/inbox'),
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'Pipeline',
    isActive: (p) => p === '/leads',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="18" /><rect x="14" y="3" width="7" height="10" />
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'Clientes',
    isActive: (p) => p.startsWith('/leads/'),
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/appointments',
    label: 'Follow-up',
    isActive: (p) => p.startsWith('/appointments'),
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
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

  navItems[3].badge = leadsCount || undefined

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="w-52 shrink-0 h-screen flex flex-col border-r"
      style={{ background: '#0b1120', borderColor: '#1a2235' }}
    >
      {/* Clinic name */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #1a2235' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
          {clinicName}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          const active = item.isActive(pathname)
          return (
            <Link
              key={`${item.href}-${i}`}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all',
                active ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-200'
              )}
              style={active ? { background: 'rgba(16,185,129,0.10)' } : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ background: '#1a2235', color: '#6b7280' }}
                >
                  {item.badge > 999 ? '999+' : item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}

        <div className="my-2" style={{ borderTop: '1px solid #1a2235' }} />

        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all',
            pathname.startsWith('/settings') ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-200'
          )}
          style={pathname.startsWith('/settings') ? { background: 'rgba(16,185,129,0.10)' } : undefined}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="flex-1">Ajustes</span>
        </Link>
      </nav>

      {/* Logout */}
      <div className="p-3" style={{ borderTop: '1px solid #1a2235' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all text-gray-600 hover:text-gray-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
