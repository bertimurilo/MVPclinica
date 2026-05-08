import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentClinicId, getLeads } from '@/lib/actions'
import { InboxClient } from '@/components/inbox/InboxClient'

export const metadata: Metadata = { title: 'Inbox' }

export default async function InboxPage() {
  let clinicId: string
  try {
    clinicId = await getCurrentClinicId()
  } catch {
    redirect('/login')
  }

  const leads = await getLeads(clinicId)

  return <InboxClient clinicId={clinicId} initialLeads={leads} />
}
