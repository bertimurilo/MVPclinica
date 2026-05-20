'use server'

import { createClient } from '@/lib/supabase/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
