import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let clinicName = 'Mi Clínica'
  let leadsCount = 0

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const admin = createServiceClient()
      const { data: userData } = await admin
        .from('users')
        .select('clinic_id, clinics(name)')
        .eq('id', user.id)
        .single()

      if (userData?.clinics) {
        clinicName = (userData.clinics as { name: string }).name
      }

      if (userData?.clinic_id) {
        const { count } = await admin
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', userData.clinic_id as string)
        leadsCount = count ?? 0
      }
    }
  } catch {}

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#030712' }}>
      {/* Green ambient glow — matches landing */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(60% 50% at 80% 0%, rgba(16,185,129,0.12), transparent 60%),
            radial-gradient(50% 40% at 10% 30%, rgba(5,150,105,0.06), transparent 60%)
          `,
        }}
      />
      <Sidebar clinicName={clinicName} leadsCount={leadsCount} />
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
