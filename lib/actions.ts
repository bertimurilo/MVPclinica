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
  const supabase = createServiceClient()
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
  const supabase = createServiceClient()
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

export async function returnToAgent(leadId: string, clinicId: string) {
  await assertClinicActive(clinicId)
  const supabase = createClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('leads')
    .update({ escalated: false, escalation_reset_at: now, updated_at: now })
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
  const instanceId = formData.instanceId.trim()
  const token = formData.token.trim()
  // Un z_api_instance_id vacío ('') matchearía el fallback del webhook y
  // recibiría mensajes de otras clínicas — nunca guardarlo vacío.
  if (!instanceId || !token) throw new Error('El Instance ID y el Token de Z-API son obligatorios')
  const { error } = await supabase
    .from('clinics')
    .update({
      z_api_instance_id:   instanceId,
      z_api_token:         token,
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

// ─── Treatments (read) ────────────────────────────────────────────────────────

export async function getTreatments(clinicId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('treatments')
    .select('id, name, price, duration_minutes')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .eq('active', true)
    .order('name')
  return data ?? []
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function createAppointment(
  leadId: string,
  clinicId: string,
  payload: { treatment_id?: string; appointment_date?: string; notes?: string }
) {
  await assertClinicActive(clinicId)
  const supabase = createServiceClient()
  const { error } = await supabase.from('appointments').insert({
    lead_id: leadId,
    clinic_id: clinicId,
    status: 'agendada',
    proposed_by: 'human',
    requires_human_confirmation: false,
    treatment_id: payload.treatment_id || null,
    appointment_date: payload.appointment_date || null,
    notes: payload.notes || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/leads')
}

export async function updateAppointmentStatus(
  appointmentId: string,
  clinicId: string,
  status: 'confirmada' | 'cancelada'
) {
  await assertClinicActive(clinicId)
  const supabase = createServiceClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'confirmada') {
    patch.requires_human_confirmation = false
    patch.confirmed_at = new Date().toISOString()
  }
  const { error } = await supabase
    .from('appointments')
    .update(patch)
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

export async function getLeadTimeline(leadId: string, clinicId: string) {
  const supabase = createClient()

  const [leadRes, messagesRes, appointmentsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('created_at, escalated, escalation_reset_at')
      .eq('id', leadId)
      .eq('clinic_id', clinicId)
      .single(),
    supabase
      .from('messages')
      .select('created_at, direction')
      .eq('lead_id', leadId)
      .eq('clinic_id', clinicId)
      .order('created_at'),
    supabase
      .from('appointments')
      .select('id, created_at, confirmed_at, appointment_date, status, treatment:treatments(name)')
      .eq('lead_id', leadId)
      .eq('clinic_id', clinicId)
      .order('created_at'),
  ])

  const lead = leadRes.data
  const messages = messagesRes.data ?? []
  const appointments = appointmentsRes.data ?? []

  const events: import('@/lib/types').TimelineEvent[] = []

  // First contact
  if (lead?.created_at) {
    events.push({ type: 'lead_created', timestamp: lead.created_at, label: 'Primer contacto' })
  }

  // Messages grouped by day
  const dayMap: Record<string, number> = {}
  for (const msg of messages) {
    const day = msg.created_at.slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  for (const [day, count] of Object.entries(dayMap)) {
    const date = new Date(day + 'T12:00:00Z')
    const label = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    events.push({
      type: 'messages_day',
      timestamp: day + 'T00:00:00.000Z',
      label: `${count} mensaje${count !== 1 ? 's' : ''}`,
      detail: label,
    })
  }

  // Appointments
  for (const appt of appointments) {
    const treatmentName = ((appt.treatment as unknown) as { name: string } | null)?.name ?? null

    events.push({
      type: 'appointment_proposed',
      timestamp: appt.created_at,
      label: 'Cita propuesta',
      detail: treatmentName ?? undefined,
    })

    if (appt.status === 'confirmada' && appt.confirmed_at) {
      events.push({
        type: 'appointment_confirmed',
        timestamp: appt.confirmed_at,
        label: 'Cita confirmada',
        detail: treatmentName ?? undefined,
      })
    }

    if (appt.status === 'cancelada') {
      events.push({
        type: 'appointment_cancelled',
        timestamp: appt.created_at,
        label: 'Cita cancelada',
        detail: treatmentName ?? undefined,
      })
    }
  }

  // Escalation state
  if (lead?.escalated) {
    events.push({ type: 'escalated', timestamp: new Date().toISOString(), label: 'Escalado a humano' })
  }
  if (lead?.escalation_reset_at) {
    events.push({ type: 'escalation_reset', timestamp: lead.escalation_reset_at, label: 'Devuelto al agente IA' })
  }

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  return events
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
