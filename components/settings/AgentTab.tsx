'use client'

import { useState, useTransition } from 'react'
import { saveAgentConfig } from '@/app/(dashboard)/settings/actions'
import type { AgentConfig } from '@/lib/types'

const DAYS = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
]

const TONES = [
  { value: 'profesional', label: 'Profesional', desc: 'Formal pero accesible, equilibrado' },
  { value: 'cercano',     label: 'Cercano',     desc: 'Amigable y conversacional' },
  { value: 'formal',      label: 'Formal',      desc: 'Muy serio y protocolar' },
  { value: 'calido',      label: 'Cálido',      desc: 'Empático y comprensivo' },
]

const INPUT_CLS =
  'w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none'

type Props = { config: AgentConfig | null }

export function AgentTab({ config }: Props) {
  const [tone, setTone] = useState(config?.tone ?? 'profesional')
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DAYS.map(d => [d.key, !!config?.business_hours?.[d.key]]))
  )
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const toggleDay = (key: string) =>
    setEnabledDays(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveAgentConfig(new FormData(e.currentTarget))
      setStatus(result?.error ? 'error' : 'saved')
      setTimeout(() => setStatus('idle'), 2500)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">

      {/* Tone */}
      <Section title="Personalidad">
        <div className="grid grid-cols-2 gap-3">
          {TONES.map(t => (
            <label key={t.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="tone"
                value={t.value}
                checked={tone === t.value}
                onChange={() => setTone(t.value as AgentConfig['tone'])}
                className="sr-only"
              />
              <div className={`p-3.5 rounded-xl border transition-all ${
                tone === t.value
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              }`}>
                <p className={`text-sm font-semibold ${tone === t.value ? 'text-emerald-400' : 'text-white'}`}>
                  {t.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 space-y-1.5">
          <label className="block text-sm font-medium text-gray-300">Instrucciones adicionales</label>
          <textarea
            name="custom_instructions"
            rows={3}
            defaultValue={config?.custom_instructions ?? ''}
            placeholder="Ej: Siempre menciona que tenemos parking gratuito y que hacemos primera consulta gratis"
            className={INPUT_CLS}
          />
        </div>
      </Section>

      {/* Messages */}
      <Section title="Mensajes automáticos">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Bienvenida</label>
            <textarea
              name="welcome_message"
              rows={2}
              defaultValue={config?.welcome_message ?? 'Hola, soy el asistente virtual de la clínica. ¿En qué puedo ayudarte?'}
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Al escalar a recepción</label>
            <textarea
              name="fallback_message"
              rows={2}
              defaultValue={config?.fallback_message ?? 'Te paso con nuestra recepcionista. Te contactará en breve.'}
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Fuera de horario</label>
            <textarea
              name="out_of_hours_message"
              rows={2}
              defaultValue={config?.out_of_hours_message ?? 'Ahora mismo estamos fuera de horario. Te responderemos mañana a primera hora.'}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </Section>

      {/* Escalation rules */}
      <Section title="Reglas de escalado">
        <div className="space-y-3">
          {[
            { name: 'escalation_unknown',  defaultChecked: !!config?.escalation_rules?.unknown_question, label: 'Preguntan por un tratamiento no disponible',            desc: 'El agente derivará si el cliente pregunta por algo fuera del catálogo' },
            { name: 'escalation_surgery',  defaultChecked: !!config?.escalation_rules?.surgery_mention,  label: 'Mencionan cirugía u otros temas médicos complejos',     desc: 'Protege ante preguntas que requieren criterio médico profesional' },
            { name: 'escalation_complaint', defaultChecked: !!config?.escalation_rules?.complaint,       label: 'El cliente expresa una queja o insatisfacción',         desc: 'Las quejas siempre las gestiona un humano' },
          ].map(rule => (
            <label key={rule.name} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name={rule.name}
                defaultChecked={rule.defaultChecked}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500/30 shrink-0"
              />
              <div>
                <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{rule.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{rule.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>

      {/* Business hours */}
      <Section title="Horario de atención">
        <div className="space-y-2">
          {DAYS.map(day => (
            <div key={day.key} className="flex items-center gap-4 py-1">
              {/* Toggle */}
              <label className="flex items-center gap-3 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name={`bh_${day.key}_enabled`}
                  checked={enabledDays[day.key]}
                  onChange={() => toggleDay(day.key)}
                  className="sr-only peer"
                />
                <span className="relative w-9 h-5 bg-gray-700 peer-checked:bg-emerald-500 rounded-full transition-colors block shrink-0 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-transform peer-checked:after:translate-x-4" />
                <span className="text-sm text-gray-300 w-24">{day.label}</span>
              </label>

              {/* Time inputs */}
              {enabledDays[day.key] ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    name={`bh_${day.key}_open`}
                    defaultValue={config?.business_hours?.[day.key]?.open ?? '09:00'}
                    className="bg-gray-900 border border-gray-700 text-white rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  <span className="text-gray-600 text-sm">—</span>
                  <input
                    type="time"
                    name={`bh_${day.key}_close`}
                    defaultValue={config?.business_hours?.[day.key]?.close ?? '20:00'}
                    className="bg-gray-900 border border-gray-700 text-white rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              ) : (
                <span className="text-xs text-gray-600">Cerrado</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Max auto messages */}
      <Section title="Límite de mensajes automáticos">
        <div className="flex items-center gap-4">
          <input
            type="number"
            name="max_auto_messages"
            min="1"
            max="100"
            defaultValue={config?.max_auto_messages ?? 10}
            className="w-24 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          <p className="text-sm text-gray-400">
            El agente escalará al humano tras este número de mensajes automáticos
          </p>
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isPending && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Guardar cambios
        </button>
        {status === 'saved' && <span className="text-sm text-emerald-400">Cambios guardados</span>}
        {status === 'error' && <span className="text-sm text-red-400">Error al guardar</span>}
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
