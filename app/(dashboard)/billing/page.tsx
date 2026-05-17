import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from '@/components/billing/BillingClient'
import { PLAN, getSubscriptionStatus } from '@/lib/stripe'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('clinic_id, clinics(stripe_customer_id, stripe_subscription_id, active)')
    .eq('id', user.id)
    .single()

  const clinic = userData?.clinics as unknown as {
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    active: boolean
  } | null

  const isSubscribed = !!clinic?.stripe_customer_id && (clinic?.active ?? false)

  let subscriptionDetails: { currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null = null
  if (isSubscribed && clinic?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const raw = await getSubscriptionStatus(clinic.stripe_subscription_id)
      subscriptionDetails = {
        currentPeriodEnd: raw.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: raw.cancelAtPeriodEnd,
      }
    } catch {}
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white">Facturación</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona tu suscripción y método de pago</p>
        </div>

        {/* Banners */}
        {searchParams.success && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-green-300 flex items-center gap-2.5"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            ¡Suscripción activada correctamente! Ya tienes acceso completo a Venu Pro.
          </div>
        )}
        {searchParams.canceled && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-amber-300 flex items-center gap-2.5"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.
          </div>
        )}

        <BillingClient
          isSubscribed={isSubscribed}
          plan={PLAN}
          subscriptionDetails={subscriptionDetails}
        />
      </div>
    </div>
  )
}
