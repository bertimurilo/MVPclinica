'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AppointmentStatus } from '@/lib/types'

async function getClinicId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('clinic_id').eq('id', user.id).single()
  return (data as { clinic_id: string } | null)?.clinic_id ?? null
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const supabase = createClient()
  const clinicId = await getClinicId()
  if (!clinicId) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/appointments')
  return { success: true }
}
