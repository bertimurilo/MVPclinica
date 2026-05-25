'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { saveZApiCredentials, updateWhatsAppStatus } from '@/lib/actions'

interface Props {
  clinicId:       string
  instanceId:     string | null
  token:          string | null
  clientToken:    string | null
  phoneWhatsapp:  string | null
  connected:      boolean
  /** Pre-built webhook URL including the secret query param — passed from a Server Component so the secret never reaches the client bundle. Falls back to the public URL without secret. */
  webhookUrl?:    string
}

export function WhatsAppTab({
  clinicId,
  instanceId:    initialInstanceId,
  token:         initialToken,
  clientToken:   initialClientToken,
  phoneWhatsapp: initialPhone,
  connected:     initialConnected,
  webhookUrl:    webhookUrlProp,
}: Props) {
  const [instanceId,    setInstanceId]    = useState(initialInstanceId ?? '')
  const [token,         setToken]         = useState(initialToken ?? '')
  const [clientToken,   setClientToken]   = useState(initialClientToken ?? '')
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(initialPhone ?? '')
  const [showToken,     setShowToken]     = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [isPending,     startTransition]  = useTransition()
  const [isConnected,   setIsConnected]   = useState(initialConnected)
  const [testing,       setTesting]       = useState(false)
  const [testMessage,   setTestMessage]   = useState<{ ok: boolean; text: string } | null>(null)
  const [showQR,        setShowQR]        = useState(false)
  const [qrSrc,         setQrSrc]         = useState<string | null>(null)
  const [qrError,       setQrError]       = useState<string | null>(null)
  const [qrLoading,     setQrLoading]     = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const webhookUrl = webhookUrlProp ?? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/webhook/zapi`
  const hasCredentials = !!(initialInstanceId && initialToken)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/zapi/test', { method: 'POST' })
      const data = await res.json()
      if (data.connected) {
        setIsConnected(true)
        setShowQR(false)
        stopPolling()
        setTestMessage({ ok: true, text: 'WhatsApp conectado ✓' })
        return true
      }
    } catch {}
    return false
  }, [stopPolling])

  async function loadQR() {
    setQrLoading(true)
    setQrError(null)
    try {
      const res = await fetch('/api/zapi/qr')
      const contentType = res.headers.get('Content-Type') ?? ''

      if (res.ok && contentType.startsWith('image/')) {
        const blob = await res.blob()
        setQrSrc(URL.createObjectURL(blob))
        return
      }

      const data = await res.json().catch(() => ({}))

      if (data.alreadyConnected) {
        // Z-API confirmed it's already connected — update local state
        setIsConnected(true)
        setShowQR(false)
        stopPolling()
        setTestMessage({ ok: true, text: 'WhatsApp ya estaba conectado ✓' })
        return
      }

      setQrError(data.error ?? 'No se pudo obtener el QR')
      setQrSrc(null)
    } catch {
      setQrError('Error de red al obtener el QR')
      setQrSrc(null)
    } finally {
      setQrLoading(false)
    }
  }

  async function handleShowQR() {
    setShowQR(true)
    await loadQR()
    stopPolling()
    pollRef.current = setInterval(checkStatus, 5000)
  }

  function handleHideQR() {
    setShowQR(false)
    stopPolling()
  }

  async function handleTest() {
    setTesting(true)
    setTestMessage(null)
    try {
      const res = await fetch('/api/zapi/test', { method: 'POST' })
      const data = await res.json()
      const conn = !!data.connected
      setIsConnected(conn)
      setTestMessage({ ok: conn, text: data.message ?? (conn ? 'Conectado' : 'No conectado') })
      if (conn) {
        setShowQR(false)
        stopPolling()
      }
    } catch {
      setTestMessage({ ok: false, text: 'Error al verificar la conexión' })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    startTransition(async () => {
      await saveZApiCredentials({ clinicId, instanceId, token, clientToken, phoneWhatsapp })
      setIsConnected(false)
      setShowQR(false)
      stopPolling()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  async function handleDisconnect() {
    await updateWhatsAppStatus(false)
    setIsConnected(false)
    setShowQR(false)
    stopPolling()
  }

  return (
    <div className="space-y-6">

      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isConnected
          ? 'border-violet-500/30 bg-violet-500/10'
          : 'border-red-500/30 bg-red-500/10'
      }`}>
        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
          isConnected ? 'bg-violet-400' : 'bg-red-400'
        }`} />
        <div>
          <p className="text-sm font-medium text-white">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </p>
          <p className="text-xs text-white/50">
            {isConnected
              ? `WhatsApp activo en ${initialPhone ?? 'número desconocido'}`
              : 'Configura las credenciales y escanea el QR para activar'}
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
          <label className="text-xs text-white/50">
            Security Token (Client-Token)
          </label>
          <input
            type="password"
            value={clientToken}
            onChange={e => setClientToken(e.target.value)}
            placeholder="Token de seguridad de tu cuenta Z-API"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-violet-500 focus:outline-none"
          />
          <p className="text-xs text-white/30">
            En Z-API → tu cuenta → <em>Security Token</em>. Distinto al token de la instancia.
          </p>
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
            Pega esta URL en Z-API → tu instancia → Webhooks → <em>Ao receber</em> (On Message Received)
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
        <p className="text-xs text-amber-400/80">
          Asegúrate de que esta URL sea la de producción (Vercel), no localhost. Si ves &quot;localhost&quot;, configura{' '}
          <code className="text-white/60">NEXT_PUBLIC_APP_URL</code> en Vercel con tu dominio real.
        </p>
      </div>

      {/* QR / Connection section */}
      {hasCredentials && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Conexión WhatsApp</h3>
            <p className="text-xs text-white/40 mt-0.5">
              {isConnected
                ? 'Número vinculado y activo. El agente responde mensajes automáticamente.'
                : 'Escanea el QR con WhatsApp para vincular el número.'}
            </p>
          </div>

          {/* QR code panel (only when disconnected) */}
          {!isConnected && (
            <div className="space-y-3">
              {!showQR ? (
                <button
                  onClick={handleShowQR}
                  className="w-full rounded-md border border-violet-500/40 bg-violet-600/10 px-4 py-2.5 text-sm font-medium text-violet-300 hover:bg-violet-600/20 transition-colors"
                >
                  Mostrar código QR para vincular
                </button>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/30 p-5 flex flex-col items-center gap-4">
                  {qrLoading && (
                    <div className="h-48 w-48 flex items-center justify-center">
                      <span className="text-xs text-white/40">Cargando QR…</span>
                    </div>
                  )}
                  {!qrLoading && qrSrc && (
                    <>
                      <img src={qrSrc} alt="QR para vincular WhatsApp" className="w-48 h-48 rounded-lg" />
                      <div className="text-center space-y-1">
                        <p className="text-xs text-white/60">
                          Abre WhatsApp → <strong>Dispositivos vinculados</strong> → Vincular dispositivo
                        </p>
                        <p className="text-xs text-violet-400 animate-pulse">
                          Esperando escaneo… (verificando cada 5 s)
                        </p>
                      </div>
                    </>
                  )}
                  {!qrLoading && qrError && (
                    <div className="text-center space-y-2 py-2">
                      <p className="text-xs text-red-400">{qrError}</p>
                      {qrError.includes('Z_API_CLIENT_TOKEN') && (
                        <p className="text-xs text-white/40">
                          Añade <code className="text-violet-300">Z_API_CLIENT_TOKEN</code> en tus variables de entorno (Vercel → Settings → Environment Variables).
                          Es el <em>Security Token</em> de tu cuenta Z-API.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3">
                    {!qrLoading && (
                      <button
                        onClick={loadQR}
                        className="text-xs text-white/30 hover:text-white/60 transition-colors"
                      >
                        Actualizar QR
                      </button>
                    )}
                    <button
                      onClick={handleHideQR}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="rounded-md px-4 py-2 text-sm font-medium transition-colors bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30"
              >
                Desconectar
              </button>
            )}
            <button
              onClick={handleTest}
              disabled={testing}
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white hover:border-white/30 disabled:opacity-40 transition-colors"
            >
              {testing ? 'Verificando…' : 'Verificar conexión'}
            </button>
          </div>

          {testMessage && (
            <p className={`text-xs ${testMessage.ok ? 'text-violet-400' : 'text-red-400'}`}>
              {testMessage.text}
            </p>
          )}
        </div>
      )}

      {/* Setup guide */}
      {!isConnected && (
        <details className="rounded-lg border border-white/10 bg-white/5 p-5 group">
          <summary className="text-sm font-semibold text-white cursor-pointer select-none list-none flex items-center justify-between">
            Guía de configuración paso a paso
            <span className="text-white/30 text-xs group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <ol className="mt-4 space-y-3 text-xs text-white/60 list-decimal list-inside">
            <li>
              En <strong className="text-white/80">Z-API</strong>, crea o abre tu instancia y copia el
              {' '}<strong className="text-white/80">Instance ID</strong> y el <strong className="text-white/80">Token</strong>.
            </li>
            <li>
              En tu cuenta Z-API ve a <strong className="text-white/80">Configurações → Security Token</strong> y copia
              el valor. Agrégalo como variable de entorno{' '}
              <code className="text-violet-300">Z_API_CLIENT_TOKEN</code> en Vercel.
            </li>
            <li>
              Pega el <strong className="text-white/80">Instance ID</strong>, <strong className="text-white/80">Token</strong>
              {' '}y <strong className="text-white/80">Número de WhatsApp</strong> arriba y haz clic en{' '}
              <em>Guardar credenciales</em>.
            </li>
            <li>
              En Z-API, abre tu instancia → <strong className="text-white/80">Webhooks</strong> → campo{' '}
              <em>On Message Received</em> → pega la URL del webhook que aparece en esta página.
            </li>
            <li>
              Haz clic en <strong className="text-white/80">Mostrar código QR</strong>, abre WhatsApp en tu
              teléfono, ve a <em>Dispositivos vinculados → Vincular dispositivo</em> y escanea el QR.
            </li>
            <li>
              Una vez escaneado, el estado cambiará a <strong className="text-violet-400">Conectado</strong> automáticamente.
            </li>
          </ol>
        </details>
      )}
    </div>
  )
}
