'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/zapi'
import type { Appointment, Lead, LeadStatus, Message } from '@/lib/types'

// ─── Auth + subscription helpers ─────────────────────────────────────────────

/** Throws 'Suscripción inactiva' if the clinic's subscription is not active. */
export async function assertClinicActive(clinicId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('clinics')
    .select('active')
    .eq('id', clinicId)
    .single()
  if (!data?.active) {
    throw new Error('Suscripción inactiva')
  }
}

export async function getCurrentClinicId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data } = await supabase
    .from('users')
    .select('clinic_id')
    .eq('id', user.id)
    .single()

  const clinicId = (data as { clinic_id: string } | null)?.clinic_id
  if (!clinicId) throw new Error('Clínica no encontrada')
  return clinicId
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats(clinicId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_dashboard_stats', { p_clinic_id: clinicId })
  if (error) throw new Error(error.message)
  return data as {
    leads_hoy: number
    leads_hoy_ayer: number
    leads_activos: number
    citas_semana: number
    citas_semana_pasada: number
    tasa_conversion: number
  }
}

export async function getRecentLeads(clinicId: string) {
  const supabase = createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, status, qualification, score, last_message_at, treatment_interest')
    .eq('clinic_id', clinicId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(10)

  if (!leads || leads.length === 0) return []

  const leadIds = (leads as Array<{ id: string }>).map(l => l.id)
  const { data: messages } = await supabase
    .from('messages')
    .select('lead_id, content')
    .in('lead_id', leadIds)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(leadIds.length)

  const lastMsgByLead: Record<string, string> = {}
  for (const msg of (messages ?? []) as Array<{ lead_id: string; content: string }>) {
    if (!lastMsgByLead[msg.lead_id]) lastMsgByLead[msg.lead_id] = msg.content
  }

  return (leads as Array<{ id: string; [key: string]: unknown }>).map(l => ({
    ...l,
    last_message: lastMsgByLead[l.id] ?? null,
  }))
}

export async function getLeadsDistribution(clinicId: string): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_leads_distribution', { p_clinic_id: clinicId })
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as Array<{ status: string; count: number }>) {
    counts[row.status] = row.count
  }
  return counts
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function getLeads(
  clinicId: string,
  options?: { status?: string; search?: string; limit?: number }
): Promise<Lead[]> {
  const supabase = createClient()

  let query = supabase
    .from('leads')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }
  if (options?.search) {
    const s = options.search.replace(/[%_']/g, '')
    if (s) query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%`)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data } = await query
  return (data ?? []) as unknown as Lead[]
}

export async function getLead(
  leadId: string,
  clinicId: string
): Promise<{ lead: Lead; messages: Message[] } | null> {
  const supabase = createClient()

  const [{ data: lead }, { data: messages }] = await Promise.all([
    supabase
      .from('leads')
      .select('*, appointments(*, treatment:treatments(*))')
      .eq('id', leadId)
      .eq('clinic_id', clinicId)
      .single(),
    supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true }),
  ])

  if (!lead) return null
  return {
    lead: lead as unknown as Lead,
    messages: (messages ?? []) as unknown as Message[],
  }
}

export async function updateLeadName(leadId: string, name: string) {
  const clinicId = await getCurrentClinicId()
  await assertClinicActive(clinicId)
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('leads')
    .update({ name: name.trim() })
    .eq('id', leadId)
    .eq('clinic_id', clinicId)
  if (error) throw new Error(error.message)
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function updateLeadStatus(leadId: string, clinicId: string, status: LeadStatus) {
  await assertClinicActive(clinicId)
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('clinic_id', clinicId)

  if (error) return { error: error.message }
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { success: true }
}

export async function saveLeadNote(leadId: string, clinicId: string, notes: string) {
  await assertClinicActive(clinicId)
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('clinic_id', clinicId)

  if (error) return { error: error.message }
  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

export async function escalateLead(leadId: string, clinicId: string) {
  await assertClinicActive(clinicId)
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ escalated: true, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('clinic_id', clinicId)

  if (error) return { error: error.message }
  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

export async function sendHumanMessage(leadId: string, clinicId: string, content: string) {
  if (!content.trim()) return { error: 'Mensaje vacío' }
  await assertClinicActive(clinicId)

  const supabase = createClient()

  const [{ data: lead }, { data: clinic }] = await Promise.all([
    supabase.from('leads').select('phone').eq('id', leadId).eq('clinic_id', clinicId).single(),
    supabase
      .from('clinics')
      .select('z_api_instance_id, z_api_token, z_api_connected, z_api_client_token')
      .eq('id', clinicId)
      .single(),
  ])

  if (!lead) return { error: 'Lead no encontrado' }

  const { error } = await supabase.from('messages').insert({
    lead_id: leadId,
    clinic_id: clinicId,
    direction: 'outbound',
    sender: 'human',
    message_type: 'text',
    content: content.trim(),
  })

  if (error) return { error: error.message }

  const c = clinic as { z_api_instance_id?: string; z_api_token?: string; z_api_connected?: boolean; z_api_client_token?: string | null } | null
  if (c?.z_api_connected && c.z_api_instance_id && c.z_api_token) {
    await sendMessage(
      (lead as { phone: string }).phone,
      content.trim(),
      c.z_api_instance_id,
      c.z_api_token,
      c.z_api_client_token
    )
  }

  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

// ─── WhatsApp / Z-API ────────────────────────────────────────────────────────

export async function saveZApiCredentials(formData: {
  clinicId: string
  instanceId: string
  token: string
  clientToken: string
  phoneWhatsapp: string
}) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  const { error } = await supabase
    .from('clinics')
    .update({
      z_api_instance_id:   formData.instanceId.trim(),
      z_api_token:         formData.token.trim(),
      z_api_client_token:  formData.clientToken.trim() || null,
      phone_whatsapp:      formData.phoneWhatsapp.trim(),
      z_api_connected:     false,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', clinicId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function updateWhatsAppStatus(connected: boolean) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  const { error } = await supabase
    .from('clinics')
    .update({ z_api_connected: connected, updated_at: new Date().toISOString() })
    .eq('id', clinicId)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function updateAppointmentStatus(
  appointmentId: string,
  clinicId: string,
  status: 'confirmada' | 'cancelada'
) {
  await assertClinicActive(clinicId)
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
  if (error) throw new Error(error.message)
  revalidatePath('/leads')
}

export async function getAppointmentsByMonth(clinicId: string, year: number, month: number) {
  const supabase = createClient()
  const startDate = new Date(year, month, 1).toISOString()
  const endDate = new Date(year, month + 1, 1).toISOString()

  const { data } = await supabase
    .from('appointments')
    .select('*, lead:leads(name, phone), treatment:treatments(name, price, duration_minutes)')
    .eq('clinic_id', clinicId)
    .gte('appointment_date', startDate)
    .lt('appointment_date', endDate)
    .order('appointment_date')

  return data ?? []
}

export async function getEstimatedRevenue(clinicId: string) {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('appointments')
    .select('treatments(price)')
    .eq('clinic_id', clinicId)
    .in('status', ['confirmada', 'completada'])
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (error) return { total: 0, count: 0 }
  const total = (data ?? []).reduce((sum, a) => {
    const price = (a.treatments as { price?: number } | null)?.price ?? 0
    return sum + price
  }, 0)
  return { total, count: data?.length ?? 0 }
}

export async function getAppointmentsByDay(clinicId: string) {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_date')
    .eq('clinic_id', clinicId)
    .gte('appointment_date', thirtyDaysAgo.toISOString())
    .order('appointment_date', { ascending: true })

  if (error || !data) return []

  const grouped: Record<string, number> = {}
  data.forEach(a => {
    if (!a.appointment_date) return
    const day = a.appointment_date.slice(0, 10)
    grouped[day] = (grouped[day] ?? 0) + 1
  })

  return Object.entries(grouped).map(([date, count]) => ({ date, count }))
}
