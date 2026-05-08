'use client'

import { useState, useTransition } from 'react'
import { saveClinicInfo } from '@/app/(dashboard)/settings/actions'
import type { Clinic } from '@/lib/types'
import { Input } from '@/components/ui/Input'

type Props = { clinic: Clinic | null }

export function ClinicTab({ clinic }: Props) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveClinicInfo(new FormData(e.currentTarget))
      setStatus(result?.error ? 'error' : 'saved')
      setTimeout(() => setStatus('idle'), 2500)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <Section title="Información de la clínica">
        <div className="space-y-4">
          <Input label="Nombre" name="name" defaultValue={clinic?.name ?? ''} required />
          <Input label="Email de contacto" name="email" type="email" defaultValue={clinic?.email ?? ''} />
          <Input label="Teléfono" name="phone" type="tel" defaultValue={clinic?.phone ?? ''} />
          <Input label="Dirección" name="address" defaultValue={clinic?.address ?? ''} />
          <Input label="Ciudad" name="city" defaultValue={clinic?.city ?? ''} />
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <SaveButton pending={isPending} />
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

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 text-sm font-medium rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      {pending && (
        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
      Guardar cambios
    </button>
  )
}
