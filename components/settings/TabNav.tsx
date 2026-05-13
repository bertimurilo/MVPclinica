'use client'

import { useRouter } from 'next/navigation'

const TABS = [
  { id: 'tratamientos', label: 'Tratamientos' },
  { id: 'agente', label: 'Agente IA' },
  { id: 'clinica', label: 'Clínica' },
  { id: 'whatsapp', label: 'WhatsApp' },
]

export function TabNav({ active }: { active: string }) {
  const router = useRouter()

  return (
    <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1 w-fit">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => router.push(`/settings?tab=${tab.id}`)}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
            active === tab.id
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
