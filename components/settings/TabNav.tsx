'use client'

import { useRouter } from 'next/navigation'

const TABS = [
  { id: 'tratamientos', label: 'Tratamientos' },
  { id: 'agente',       label: 'Agente IA' },
  { id: 'clinica',      label: 'Clínica' },
  { id: 'whatsapp',     label: 'WhatsApp' },
]

export function TabNav({ active }: { active: string }) {
  const router = useRouter()

  return (
    <div
      className="flex flex-nowrap gap-1 rounded-xl p-1 w-full sm:w-fit overflow-x-auto"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => router.push(`/settings?tab=${tab.id}`)}
          className={`px-3 sm:px-4 py-2 text-sm rounded-lg font-medium transition-all whitespace-nowrap ${
            active === tab.id
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
