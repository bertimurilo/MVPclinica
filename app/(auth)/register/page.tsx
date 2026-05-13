'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import VenuIcon from '@/components/ui/VenuIcon'
import { createClinicAndUser } from './actions'

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

    if (authData.user) {
      const result = await createClinicAndUser(authData.user.id, email, clinicName)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
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
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
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
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
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
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

          </form>

          <p className="text-center text-xs text-gray-600 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
