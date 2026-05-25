import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import type { Treatment, AgentConfig, Clinic } from '@/lib/types'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('clinic_id')
    .eq('id', user.id)
    .single()

  const clinicId = (userData as { clinic_id: string } | null)?.clinic_id
  if (!clinicId) redirect('/login')

  const [treatmentsResult, agentResult, clinicResult] = await Promise.all([
    supabase.from('treatments').select('*').eq('clinic_id', clinicId).order('name'),
    supabase.from('agent_config').select('*').eq('clinic_id', clinicId).single(),
    supabase.from('clinics').select('*').eq('id', clinicId).single(),
  ])

  const treatments = (treatmentsResult.data as Treatment[]) ?? []
  const agentConfig = agentResult.data as AgentConfig | null
  const clinic = clinicResult.data as Clinic | null

  const base = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/webhook/zapi`
  const secret = process.env.Z_API_WEBHOOK_SECRET
  const webhookUrl = secret ? `${base}?secret=${encodeURIComponent(secret)}` : base

  return (
    <OnboardingWizard
      treatments={treatments}
      agentConfig={agentConfig}
      clinicId={clinicId}
      instanceId={clinic?.z_api_instance_id ?? null}
      token={clinic?.z_api_token ?? null}
      phoneWhatsapp={clinic?.phone_whatsapp ?? null}
      connected={clinic?.z_api_connected ?? false}
      webhookUrl={webhookUrl}
    />
  )
}
