'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MAX_SLOTS = 100

/**
 * Plazas restantes de la beta (MAX_SLOTS - inscritos en waitlist).
 * Usa service role porque la tabla waitlist solo tiene política RLS de INSERT.
 * Devuelve null si falla, para que la UI haga fallback al texto estático.
 */
export async function getWaitlistRemaining(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null

  try {
    const supabase = createServiceClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
    if (error || count == null) return null
    return Math.max(0, MAX_SLOTS - count)
  } catch {
    return null
  }
}

export async function subscribeToWaitlist(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase()

  if (!EMAIL_RE.test(trimmed)) {
    return { success: false, error: 'Introduce un email válido.' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('waitlist')
    .insert({ email: trimmed, source: 'landing' })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya estás en lista 👋' }
    }
    return { success: false, error: 'Error al guardar. Inténtalo de nuevo.' }
  }

  return { success: true }
}
