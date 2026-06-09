import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let clinicName = 'Mi Clínica'
  let leadsCount = 0
  let isActive = false
  let hasCompletedOnboarding = false

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const admin = createServiceClient()
      const { data: userData } = await admin
        .from('users')
        .select('clinic_id, clinics(name, active)')
        .eq('id', user.id)
        .single()

      if (userData?.clinics) {
        const c = userData.clinics as unknown as { name: string; active: boolean } | { name: string; active: boolean }[]
        const clinic = Array.isArray(c) ? c[0] : c
        clinicName = clinic?.name ?? clinicName
        isActive = clinic?.active ?? false
      }

      if (userData?.clinic_id) {
        const [leadsResult, treatmentsResult] = await Promise.all([
          admin
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', userData.clinic_id as string),
          admin
            .from('treatments')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', userData.clinic_id as string)
            .eq('active', true),
        ])
        leadsCount = leadsResult.count ?? 0
        hasCompletedOnboarding = (treatmentsResult.count ?? 0) > 0
      }
    }
  } catch (error) {
    console.error('[dashboard/layout] Error cargando datos de clínica:', {
      error,
      timestamp: new Date().toISOString(),
    })
    // Los valores por defecto ya están asignados arriba,
    // el layout sigue renderizando pero con datos vacíos.
    // Si el error es de autenticación, el middleware
    // redirigirá al login en la siguiente request.
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: '#030712' }}>
      {/* Ambient glows */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(65% 55% at 80% 0%, rgba(124,58,237,0.13), transparent 60%),
            radial-gradient(45% 40% at 5% 55%, rgba(109,40,217,0.07), transparent 60%),
            radial-gradient(30% 30% at 50% 100%, rgba(124,58,237,0.04), transparent 70%)
          `,
        }}
      />
      <DashboardShell clinicName={clinicName} leadsCount={leadsCount} isActive={isActive} hasCompletedOnboarding={hasCompletedOnboarding}>
        {children}
      </DashboardShell>
    </div>
  )
}
