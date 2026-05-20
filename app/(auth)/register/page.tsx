'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import VenuIcon from '@/components/ui/VenuIcon'

export default function RegisterPage() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [clinicName, setClinicName] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { clinic_name: clinicName } },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('No se pudo crear el usuario. Inténtalo de nuevo.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id, email, clinicName }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? 'Error al configurar la cuenta')
        setLoading(false)
        return
      }

      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            <VenuIcon size={44} />
            <div>
              <h1 className="text-xl font-bold text-white">Venu</h1>
              <p className="text-sm text-gray-500 mt-0.5">Crea tu cuenta</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Nombre de la clínica
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
                required
                placeholder="Clínica Belleza & Salud"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="hola@clinica.com"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

          </form>

          <p className="text-center text-xs text-gray-600 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
