'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentClinicId, assertClinicActive } from '@/lib/actions'

export async function saveTreatment(formData: FormData) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }
  await assertClinicActive(clinicId)

  const id = formData.get('id') as string | null
  const priceRaw = formData.get('price') as string
  const durRaw = formData.get('duration_minutes') as string
  const price = priceRaw ? parseFloat(priceRaw) : null
  const duration_minutes = durRaw ? parseInt(durRaw, 10) : null
  if (price !== null && (isNaN(price) || price < 0)) return { error: 'Precio inválido' }
  if (duration_minutes !== null && (isNaN(duration_minutes) || duration_minutes < 1)) return { error: 'Duración inválida' }

  const row = {
    clinic_id: clinicId,
    name: (formData.get('name') as string)?.trim(),
    description: (formData.get('description') as string)?.trim() || null,
    price,
    duration_minutes,
    category: (formData.get('category') as string) || null,
    active: formData.get('active') === 'true',
  }

  const { error } = id
    ? await supabase.from('treatments').update(row).eq('id', id).eq('clinic_id', clinicId)
    : await supabase.from('treatments').insert(row)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteTreatment(id: string) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }
  await assertClinicActive(clinicId)

  const { error } = await supabase
    .from('treatments')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function saveAgentConfig(formData: FormData) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }
  await assertClinicActive(clinicId)

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const businessHours: Record<string, { open: string; close: string } | null> = {}
  for (const day of days) {
    const enabled = formData.get(`bh_${day}_enabled`) === 'on'
    businessHours[day] = enabled
      ? {
          open: (formData.get(`bh_${day}_open`) as string) || '09:00',
          close: (formData.get(`bh_${day}_close`) as string) || '20:00',
        }
      : null
  }

  const row = {
    clinic_id: clinicId,
    tone: formData.get('tone') as string,
    welcome_message: formData.get('welcome_message') as string,
    fallback_message: formData.get('fallback_message') as string,
    out_of_hours_message: formData.get('out_of_hours_message') as string,
    escalation_rules: {
      unknown_question: formData.get('escalation_unknown') === 'on',
      surgery_mention: formData.get('escalation_surgery') === 'on',
      complaint: formData.get('escalation_complaint') === 'on',
    },
    business_hours: businessHours,
    max_auto_messages: Math.max(1, parseInt((formData.get('max_auto_messages') as string) || '10', 10) || 10),
    custom_instructions: (formData.get('custom_instructions') as string) || null,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('agent_config')
    .select('id')
    .eq('clinic_id', clinicId)
    .single()

  const { error } = existing
    ? await supabase.from('agent_config').update(row).eq('clinic_id', clinicId)
    : await supabase.from('agent_config').insert(row)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function saveClinicInfo(formData: FormData) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('clinics')
    .update({
      name: (formData.get('name') as string)?.trim(),
      email: (formData.get('email') as string)?.trim(),
      phone: (formData.get('phone') as string)?.trim(),
      address: (formData.get('address') as string)?.trim(),
      city: (formData.get('city') as string)?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function updateWhatsAppStatus(connected: boolean) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('clinics')
    .update({ z_api_connected: connected, updated_at: new Date().toISOString() })
    .eq('id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
