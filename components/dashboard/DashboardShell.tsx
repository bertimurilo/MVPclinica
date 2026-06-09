'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import { PaywallScreen } from '@/components/billing/PaywallScreen'

interface Props {
  clinicName: string
  leadsCount: number
  isActive: boolean
  hasCompletedOnboarding: boolean
  children: React.ReactNode
}

export function DashboardShell({ clinicName, leadsCount, isActive, hasCompletedOnboarding, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!hasCompletedOnboarding && pathname === '/dashboard') {
      router.replace('/onboarding')
    }
  }, [hasCompletedOnboarding, pathname, router])

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (pathname === '/onboarding') {
    return (
      <main className="flex-1 overflow-y-auto relative z-10">
        {children}
      </main>
    )
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        clinicName={clinicName}
        leadsCount={leadsCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>

      {!isActive && <PaywallScreen />}
    </>
  )
}
