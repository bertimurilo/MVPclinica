'use client'

import { useState, useTransition } from 'react'
import { saveZApiCredentials, updateWhatsAppStatus } from '@/lib/actions'

interface Props {
  clinicId:       string
  instanceId:     string | null
  token:          string | null
  phoneWhatsapp:  string | null
  connected:      boolean
}

export function WhatsAppTab({
  clinicId,
  instanceId:    initialInstanceId,
  token:         initialToken,
  phoneWhatsapp: initialPhone,
  connected,
}: Props) {
  const [instanceId,    setInstanceId]    = useState(initialInstanceId ?? '')
  const [token,         setToken]         = useState(initialToken ?? '')
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(initialPhone ?? '')
  const [showToken,     setShowToken]     = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [isPending,     startTransition]  = useTransition()
  const [testing,       setTesting]       = useState(false)
  const [testResult,    setTestResult]    = useState<{ connected: boolean; message: string } | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/zapi/test', { method: 'POST' })
      const data = await res.json()
      setTestResult({ connected: data.connected, message: data.message })
    } catch {
      setTestResult({ connected: false, message: 'Error al probar la conexión' })
    } finally {
      setTesting(false)
    }
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/zapi`
  const hasCredentials = !!(initialInstanceId && initialToken)

  async function handleSave() {
    startTransition(async () => {
      await saveZApiCredentials({ clinicId, instanceId, token, phoneWhatsapp })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        connected
          ? 'border-violet-500/30 bg-violet-500/10'
          : 'border-red-500/30 bg-red-500/10'
      }`}>
        <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <div>
          <p className="text-sm font-medium text-white">
            {connected ? 'Conectado' : 'Desconectado'}
          </p>
          <p className="text-xs text-white/50">
            {connected
              ? `WhatsApp activo en ${initialPhone ?? 'número desconocido'}`
              : 'Configura las credenciales y activa la conexión'}
          </p>
        </div>
      </div>

      {/* Credentials form */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Credenciales Z-API</h3>

        <div className="space-y-1">
          <label className="text-xs text-white/50">Instance ID</label>
          <input
            type="text"
            value={instanceId}
            onChange={e => setInstanceId(e.target.value)}
            placeholder="Ej: 3ABC123DEF456"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-white/50">Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Tu token de Z-API"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 pr-20 text-sm text-white placeholder-white/20 focus:border-violet-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/70 transition-colors px-2 py-1"
            >
              {showToken ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-white/50">Número de WhatsApp</label>
          <input
            type="tel"
            value={phoneWhatsapp}
            onChange={e => setPhoneWhatsapp(e.target.value)}
            placeholder="Ej: 5491112345678"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-violet-500 focus:outline-none"
          />
          <p className="text-xs text-white/30">Formato internacional sin + ni espacios</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || !instanceId || !token}
          className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar credenciales'}
        </button>
      </div>

      {/* Webhook URL */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">URL del Webhook</h3>
          <p className="text-xs text-white/40 mt-0.5">
            Pega esta URL en el panel de Z-API como Webhook de recepción
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-violet-300 truncate">
            {webhookUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="shrink-0 rounded-md border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors"
          >
            Copiar
          </button>
        </div>
      </div>

      {/* Connection toggle — solo si hay credenciales */}
      {hasCredentials && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Estado de conexión</h3>
          <p className="text-xs text-white/40">
            Activa después de configurar el webhook en Z-API y escanear el QR desde su panel.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => updateWhatsAppStatus(!connected)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                connected
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30'
                  : 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 border border-violet-500/30'
              }`}
            >
              {connected ? 'Desactivar conexión' : 'Activar conexión'}
            </button>

            <button
              onClick={handleTest}
              disabled={testing || !hasCredentials}
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white hover:border-white/30 disabled:opacity-40 transition-colors"
            >
              {testing ? 'Probando...' : 'Probar conexión'}
            </button>
          </div>

          {testResult && (
            <p className={`text-xs mt-2 ${testResult.connected ? 'text-emerald-400' : 'text-red-400'}`}>
              {testResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
