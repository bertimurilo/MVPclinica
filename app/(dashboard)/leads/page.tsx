import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentClinicId, getLeads } from '@/lib/actions'
import { LeadsClient } from '@/components/leads/LeadsClient'

export const metadata: Metadata = { title: 'Pipeline' }

type PageProps = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function LeadsPage({ searchParams }: PageProps) {
  let clinicId: string
  try {
    clinicId = await getCurrentClinicId()
  } catch {
    redirect('/login')
  }

  const search = typeof searchParams.q === 'string' ? searchParams.q : undefined
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined

  const leads = await getLeads(clinicId, { search, status })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Pipeline</h2>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} contactos</p>
        </div>
      </div>

      <LeadsClient
        leads={leads}
        currentSearch={search ?? ''}
        currentStatus={status ?? 'all'}
      />
    </div>
  )
}
