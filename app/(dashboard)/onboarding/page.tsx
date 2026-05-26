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
  if (!clinicId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#030712' }}>
        <div className="text-center max-w-sm">
          <p className="text-white font-semibold mb-2">Cuenta incompleta</p>
          <p className="text-gray-500 text-sm mb-6">
            Tu cuenta no tiene una clínica asociada. Contacta con soporte o cierra sesión y vuelve a registrarte.
          </p>
          <a
            href="/api/auth/logout"
            className="inline-block bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Cerrar sesión
          </a>
        </div>
      </div>
    )
  }

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
