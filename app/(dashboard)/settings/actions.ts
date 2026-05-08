'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getClinicId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('clinic_id').eq('id', user.id).single()
  return (data as { clinic_id: string } | null)?.clinic_id ?? null
}

export async function saveTreatment(formData: FormData) {
  const supabase = createClient()
  const clinicId = await getClinicId()
  if (!clinicId) return { error: 'No autenticado' }

  const id = formData.get('id') as string | null
  const priceRaw = formData.get('price') as string
  const durRaw = formData.get('duration_minutes') as string

  const row = {
    clinic_id: clinicId,
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    price: priceRaw ? parseFloat(priceRaw) : null,
    duration_minutes: durRaw ? parseInt(durRaw) : null,
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
  const clinicId = await getClinicId()
  if (!clinicId) return { error: 'No autenticado' }

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
  const clinicId = await getClinicId()
  if (!clinicId) return { error: 'No autenticado' }

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
    max_auto_messages: parseInt((formData.get('max_auto_messages') as string) || '10'),
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
  const clinicId = await getClinicId()
  if (!clinicId) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('clinics')
    .update({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function updateWhatsAppStatus(connected: boolean) {
  const supabase = createClient()
  const clinicId = await getClinicId()
  if (!clinicId) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('clinics')
    .update({ z_api_connected: connected, updated_at: new Date().toISOString() })
    .eq('id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
