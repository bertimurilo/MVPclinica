'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (!hasCompletedOnboarding && pathname === '/dashboard') {
      router.replace('/onboarding')
    }
  }, [hasCompletedOnboarding, pathname, router])

  if (pathname === '/onboarding') {
    return (
      <main className="flex-1 overflow-y-auto relative z-10">
        {children}
      </main>
    )
  }

  return (
    <>
      <Sidebar clinicName={clinicName} leadsCount={leadsCount} />
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      {!isActive && <PaywallScreen />}
    </>
  )
}
