'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import VenuIcon from '@/components/ui/VenuIcon'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Credenciales incorrectas. Inténtalo de nuevo.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
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
              <p className="text-sm text-gray-500 mt-0.5">Accede a tu panel</p>
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

          </form>

          <p className="text-center text-xs text-gray-600 mt-5">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 transition-colors">
              Regístrate
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          Venu © 2026
        </p>
      </div>
    </div>
  )
}
