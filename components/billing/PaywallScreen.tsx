'use client'

import { useState } from 'react'
import { PLAN } from '@/lib/stripe'

function Spinner() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function PaywallScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(false)
    }
  }

  const half = Math.ceil(PLAN.features.length / 2)
  const col1 = PLAN.features.slice(0, half)
  const col2 = PLAN.features.slice(half)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,7,18,0.97)', backdropFilter: 'blur(8px)' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 40% at 50% 30%, rgba(124,58,237,0.12), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Lock badge */}
        <div className="flex justify-center mb-6">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-violet-300"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Suscripción requerida
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: '1px solid rgba(124,58,237,0.35)',
            background: 'rgba(10,10,22,0.9)',
            boxShadow: '0 0 80px rgba(124,58,237,0.1), inset 0 1px 0 rgba(124,58,237,0.12)',
          }}
        >
          {/* Top line glow */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)' }}
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
                <h2 className="text-2xl font-bold text-white tracking-tight">{PLAN.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Activa tu cuenta para continuar</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-4xl font-bold text-white">€{PLAN.price}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">por mes · sin permanencia</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {[col1, col2].map((col, ci) =>
                col.map((f, i) => (
                  <div key={`${ci}-${i}`} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="shrink-0 text-violet-400"><CheckIcon /></span>
                    {f}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 py-5 space-y-3">
            {error && (
              <div
                className="rounded-lg px-3 py-2 text-xs text-red-300"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {error}
              </div>
            )}
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60 relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
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

            <div className="flex items-center justify-center gap-5 flex-wrap pt-1">
              {[
                { icon: '🔒', text: 'Pago seguro con Stripe' },
                { icon: '↩', text: 'Cancela cuando quieras' },
              ].map(({ icon, text }) => (
                <span key={text} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span>{icon}</span>
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
