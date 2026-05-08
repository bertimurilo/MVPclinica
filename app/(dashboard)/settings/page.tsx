import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TabNav } from '@/components/settings/TabNav'
import { TreatmentsTab } from '@/components/settings/TreatmentsTab'
import { AgentTab } from '@/components/settings/AgentTab'
import { ClinicTab } from '@/components/settings/ClinicTab'
import { WhatsAppTab } from '@/components/settings/WhatsAppTab'
import type { Treatment, AgentConfig, Clinic } from '@/lib/types'

type Tab = 'tratamientos' | 'agente' | 'clinica' | 'whatsapp'
const VALID_TABS: Tab[] = ['tratamientos', 'agente', 'clinica', 'whatsapp']

type PageProps = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const rawTab = typeof searchParams.tab === 'string' ? searchParams.tab : undefined
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'tratamientos'

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('clinic_id')
    .eq('id', user.id)
    .single()

  const clinicId = (userData as { clinic_id: string } | null)?.clinic_id
  if (!clinicId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-500">No hay clínica asignada a este usuario.</p>
      </div>
    )
  }

  // Fetch only what the active tab needs
  let treatments: Treatment[] = []
  let agentConfig: AgentConfig | null = null
  let clinic: Clinic | null = null

  if (tab === 'tratamientos') {
    const { data } = await supabase
      .from('treatments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name')
    treatments = (data as Treatment[]) ?? []
  } else if (tab === 'agente') {
    const { data } = await supabase
      .from('agent_config')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()
    agentConfig = data as AgentConfig | null
  } else {
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', clinicId)
      .single()
    clinic = data as Clinic | null
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-white">Ajustes</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configura tu clínica y el agente IA</p>
      </div>

      <TabNav active={tab} />

      {tab === 'tratamientos' && <TreatmentsTab treatments={treatments} />}
      {tab === 'agente' && <AgentTab config={agentConfig} />}
      {tab === 'clinica' && <ClinicTab clinic={clinic} />}
      {tab === 'whatsapp' && (
        <WhatsAppTab
          connected={clinic?.z_api_connected ?? false}
          phoneWhatsapp={clinic?.phone_whatsapp}
        />
      )}
    </div>
  )
}
