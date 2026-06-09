import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentClinicId, getLeads } from '@/lib/actions'
import { LeadsClient } from '@/components/leads/LeadsClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata: Metadata = { title: 'Pipeline' }

type PageProps = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function LeadsPage({ searchParams }: PageProps) {
  let clinicId: string
  try {
    clinicId = await getCurrentClinicId()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'No autenticado') redirect('/login')
    redirect('/onboarding')
  }

  const search = typeof searchParams.q === 'string' ? searchParams.q : undefined
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined

  const leads = await getLeads(clinicId, { search, status })

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Pipeline</h2>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} contactos</p>
        </div>
      </div>

      <ErrorBoundary>
        <LeadsClient
          leads={leads}
          currentSearch={search ?? ''}
          currentStatus={status ?? 'all'}
        />
      </ErrorBoundary>
    </div>
  )
}
