'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function createClinicAndUser(
  userId: string,
  email: string,
  clinicName: string
) {
  try {
    const supabase = createServiceClient()

    const slug =
      clinicName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now()

    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .insert({ name: clinicName, slug, email })
      .select('id')
      .single()

    if (clinicError || !clinic) {
      return { error: clinicError?.message ?? 'Error al crear la clínica' }
    }

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        clinic_id: clinic.id,
        email,
        name: clinicName,
        role: 'admin',
      })

    if (userError) {
      return { error: userError.message }
    }

    return { clinicId: clinic.id }
  } catch (err) {
    console.error('[register] createClinicAndUser error:', err)
    return { error: err instanceof Error ? err.message : 'Error inesperado al crear la cuenta' }
  }
}
