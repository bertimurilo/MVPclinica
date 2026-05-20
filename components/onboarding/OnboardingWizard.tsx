'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TreatmentsTab } from '@/components/settings/TreatmentsTab'
import { AgentTab } from '@/components/settings/AgentTab'
import { WhatsAppTab } from '@/components/settings/WhatsAppTab'
import type { Treatment, AgentConfig } from '@/lib/types'

interface Props {
  treatments: Treatment[]
  agentConfig: AgentConfig | null
  clinicId: string
  instanceId: string | null
  token: string | null
  phoneWhatsapp: string | null
  connected: boolean
}

const STEPS = [
  {
    n: 1,
    title: 'Tratamientos',
    hint: 'Añade al menos un tratamiento para que el agente sepa qué ofrecer. Puedes añadir más desde Settings.',
  },
  {
    n: 2,
    title: 'Agente IA',
    hint: 'El agente ya tiene valores por defecto. Puedes personalizar el nombre y el tono ahora o más tarde.',
  },
  {
    n: 3,
    title: 'WhatsApp',
    hint: 'Conecta tu número de WhatsApp para que el agente empiece a recibir y responder mensajes automáticamente.',
  },
]

export function OnboardingWizard({
  treatments,
  agentConfig,
  clinicId,
  instanceId,
  token,
  phoneWhatsapp,
  connected,
}: Props) {
  const [step, setStep] = useState(1)
  const router = useRouter()

  const current = STEPS.find(s => s.n === step)!

  const goNext = () => {
    if (step < 3) setStep(s => s + 1)
    else router.push('/billing')
  }

  const goBack = () => setStep(s => s - 1)

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1">
          Configuración inicial
        </p>
        <h1 className="text-2xl font-bold text-white">
          Paso {step} de 3 — {current.title}
        </h1>

        {/* Progress bar */}
        <div className="flex gap-2 mt-5">
          {STEPS.map(s => (
            <div
              key={s.n}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                s.n <= step ? 'bg-violet-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Hint */}
      <div className="w-full max-w-2xl mb-6">
        <p className="text-sm text-gray-400 bg-gray-800/60 border border-gray-700/60 rounded-lg px-4 py-3">
          {current.hint}
        </p>
      </div>

      {/* Step content */}
      <div className="w-full max-w-2xl">
        {step === 1 && <TreatmentsTab treatments={treatments} />}
        {step === 2 && <AgentTab config={agentConfig} />}
        {step === 3 && (
          <WhatsAppTab
            clinicId={clinicId}
            instanceId={instanceId}
            token={token}
            clientToken={null}
            phoneWhatsapp={phoneWhatsapp}
            connected={connected}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-2xl mt-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {step > 1 && (
            <button
              onClick={goBack}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Atrás
            </button>
          )}
          <button
            onClick={goNext}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Saltar por ahora
          </button>
        </div>

        <button
          onClick={goNext}
          className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          {step === 3 ? 'Finalizar y activar →' : 'Continuar →'}
        </button>
      </div>
    </div>
  )
}
