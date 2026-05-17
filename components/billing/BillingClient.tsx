'use client'

import { useState } from 'react'

interface SubscriptionDetails {
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

interface BillingClientProps {
  isSubscribed: boolean
  plan: { name: string; price: number; features: readonly string[] }
  subscriptionDetails?: SubscriptionDetails | null
}

function Spinner() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function BillingClient({ isSubscribed, plan, subscriptionDetails }: BillingClientProps) {
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading('checkout')
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(null)
    }
  }

  async function handleManage() {
    setLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(null)
    }
  }

  const nextBillingDate = subscriptionDetails?.currentPeriodEnd
    ? new Date(subscriptionDetails.currentPeriodEnd).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm text-red-300"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </div>
      )}

      {isSubscribed ? (
        <SubscribedCard
          plan={plan}
          nextBillingDate={nextBillingDate}
          cancelAtPeriodEnd={subscriptionDetails?.cancelAtPeriodEnd ?? false}
          onManage={handleManage}
          loading={loading === 'portal'}
        />
      ) : (
        <UnsubscribedCard
          plan={plan}
          onSubscribe={handleSubscribe}
          loading={loading === 'checkout'}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SubscribedCard({
  plan,
  nextBillingDate,
  cancelAtPeriodEnd,
  onManage,
  loading,
}: {
  plan: BillingClientProps['plan']
  nextBillingDate: string | null
  cancelAtPeriodEnd: boolean
  onManage: () => void
  loading: boolean
}) {
  const half = Math.ceil(plan.features.length / 2)
  const col1 = plan.features.slice(0, half)
  const col2 = plan.features.slice(half)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(10,10,20,0.6)' }}
    >
      {/* Header */}
      <div
        className="px-6 pt-6 pb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(109,40,217,0.04) 100%)',
          borderBottom: '1px solid rgba(124,58,237,0.12)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                Plan activo
              </span>
              <span
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-green-300"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.22)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Activo
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{plan.name}</h2>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-3xl font-bold text-white">€{plan.price}</span>
              <span className="text-sm text-gray-500">/mes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing info */}
      {(nextBillingDate || cancelAtPeriodEnd) && (
        <div
          className="px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {cancelAtPeriodEnd ? (
            <div className="flex items-center gap-2.5 text-sm text-amber-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>
                Suscripción cancelada · Activa hasta <span className="font-semibold">{nextBillingDate}</span>
              </span>
            </div>
          ) : nextBillingDate ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Próxima factura: <span className="text-gray-300 font-medium">{nextBillingDate}</span></span>
              </div>
              <span className="text-sm font-semibold text-white">€{plan.price}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Features */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {[col1, col2].map((col, ci) =>
            col.map((f, i) => (
              <div key={`${ci}-${i}`} className="flex items-center gap-2.5 text-sm text-gray-400">
                <span className="shrink-0 text-violet-400"><CheckIcon /></span>
                {f}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action */}
      <div className="px-6 py-4 flex items-center gap-3">
        <button
          onClick={onManage}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-300 transition-all hover:bg-violet-500/10 disabled:opacity-50"
          style={{ border: '1px solid rgba(124,58,237,0.3)' }}
        >
          {loading ? <Spinner /> : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          )}
          {loading ? 'Cargando...' : 'Portal de facturación'}
        </button>
        <span className="text-xs text-gray-700">Facturas, cambios de método de pago y cancelación</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function UnsubscribedCard({
  plan,
  onSubscribe,
  loading,
}: {
  plan: BillingClientProps['plan']
  onSubscribe: () => void
  loading: boolean
}) {
  const half = Math.ceil(plan.features.length / 2)
  const col1 = plan.features.slice(0, half)
  const col2 = plan.features.slice(half)

  return (
    <div className="space-y-4 max-w-xl">
      {/* Main plan card */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          border: '1px solid rgba(124,58,237,0.35)',
          background: 'rgba(10,10,22,0.8)',
          boxShadow: '0 0 60px rgba(124,58,237,0.08), inset 0 1px 0 rgba(124,58,237,0.1)',
        }}
      >
        {/* Ambient glow top */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent)' }}
        />

        {/* Header */}
        <div
          className="px-6 pt-7 pb-5"
          style={{
            background: 'linear-gradient(160deg, rgba(124,58,237,0.1) 0%, rgba(109,40,217,0.02) 60%)',
            borderBottom: '1px solid rgba(124,58,237,0.1)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1.5">Plan único</p>
              <h2 className="text-2xl font-bold text-white tracking-tight">{plan.name}</h2>
              <p className="text-sm text-gray-500 mt-1">Todo lo que necesita tu clínica</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-4xl font-bold text-white">€{plan.price}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">por mes · sin permanencia</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {[col1, col2].map((col, ci) =>
              col.map((f, i) => (
                <div key={`${ci}-${i}`} className="flex items-center gap-2.5 text-sm text-gray-400">
                  <span className="shrink-0 text-violet-400"><CheckIcon /></span>
                  {f}
                </div>
              ))
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 py-5">
          <button
            onClick={onSubscribe}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
            }}
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <><Spinner /> Redirigiendo a Stripe...</>
              ) : (
                <>
                  Activar suscripción
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Trust row */}
      <div className="flex items-center justify-center gap-5 flex-wrap">
        {[
          { icon: '🔒', text: 'Pago seguro con Stripe' },
          { icon: '↩', text: 'Cancela cuando quieras' },
          { icon: '📄', text: 'Factura automática cada mes' },
        ].map(({ icon, text }) => (
          <span key={text} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>{icon}</span>
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}
