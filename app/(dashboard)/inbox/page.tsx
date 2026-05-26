import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentClinicId, getLeads } from '@/lib/actions'
import { InboxClient } from '@/components/inbox/InboxClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = { title: 'Inbox' }

export default async function InboxPage() {
  let clinicId: string
  try {
    clinicId = await getCurrentClinicId()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'No autenticado') redirect('/login')
    redirect('/onboarding')
  }

  const leads = await getLeads(clinicId)

  return (
    <ErrorBoundary>
      <InboxClient clinicId={clinicId} initialLeads={leads} />
    </ErrorBoundary>
  )
}
