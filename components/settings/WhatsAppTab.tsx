'use client'

import { useState, useTransition } from 'react'
import { updateWhatsAppStatus } from '@/app/(dashboard)/settings/actions'

type Props = {
  connected: boolean
  phoneWhatsapp?: string | null
}

export function WhatsAppTab({ connected, phoneWhatsapp }: Props) {
  const [isConnected, setIsConnected] = useState(connected)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await updateWhatsAppStatus(!isConnected)
      if (!result?.error) setIsConnected(p => !p)
    })
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Conexión WhatsApp · Z-API</h3>
        </div>
        <div className="p-5 space-y-5">
          {/* Status banner */}
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${
            isConnected
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-red-500/5 border-red-500/20'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </p>
              {isConnected && phoneWhatsapp && (
                <p className="text-xs text-gray-400 mt-0.5">{phoneWhatsapp}</p>
              )}
              {!isConnected && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Configura tu instancia en Z-API y activa la conexión
                </p>
              )}
            </div>
          </div>

          {/* Instructions when disconnected */}
          {!isConnected && (
            <div className="space-y-2 text-sm text-gray-400">
              <p className="font-medium text-gray-300">Cómo conectar:</p>
              <ol className="space-y-1.5 list-decimal list-inside text-gray-500">
                <li>Accede a tu panel de Z-API y crea una instancia</li>
                <li>Copia el Instance ID y Token en tu <code className="bg-gray-700 px-1 rounded text-xs">.env.local</code></li>
                <li>Escanea el código QR desde la app de WhatsApp en tu móvil</li>
                <li>Activa la conexión con el botón de abajo</li>
              </ol>
            </div>
          )}

          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
              isConnected
                ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
            }`}
          >
            {isPending && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {isConnected ? 'Reconectar' : 'Activar conexión'}
          </button>
        </div>
      </div>
    </div>
  )
}
