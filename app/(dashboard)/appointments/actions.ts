'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentClinicId, assertClinicActive } from '@/lib/actions'
import type { AppointmentStatus } from '@/lib/types'

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }
  await assertClinicActive(clinicId)

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/appointments')
  return { success: true }
}
