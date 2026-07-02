import { sendMessage } from '@/lib/zapi'
import type { SupabaseClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://venucrm.com'

export async function notifyOwner(
  clinicId: string,
  message: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    const { data: clinic } = await supabase
      .from('clinics')
      .select('notification_phone, z_api_instance_id, z_api_token, z_api_client_token')
      .eq('id', clinicId)
      .single()

    if (!clinic?.notification_phone || !clinic?.z_api_instance_id || !clinic?.z_api_token) return

    await sendMessage(
      clinic.notification_phone,
      message,
      clinic.z_api_instance_id,
      clinic.z_api_token,
      clinic.z_api_client_token
    )
  } catch (err) {
    console.error('[notifyOwner] error:', err)
  }
}

export function escalationMessage(leadName: string | null, phone: string, reason: string, leadId: string): string {
  const who = leadName ?? phone
  const reasonLabel =
    reason === 'max_messages_reached' ? 'máximo de mensajes automáticos alcanzado' :
    reason === 'objection_limit'      ? '3 objeciones consecutivas sin resolver' :
    reason === 'ai_decision'          ? 'el agente detectó que necesita intervención humana' :
    reason === 'anthropic_error'      ? 'error técnico del agente IA' :
    reason === 'empty_response'       ? 'el agente devolvió una respuesta vacía' :
    reason === 'send_failed'          ? 'no se pudo entregar la respuesta por WhatsApp — revisa la conexión de Z-API' :
                                        reason
  return `🚨 Lead escalado: ${who}\nMotivo: ${reasonLabel}\nVer: ${APP_URL}/leads/${leadId}`
}

export function appointmentConfirmedMessage(
  leadName: string | null,
  treatmentName: string | null,
  appointmentDate: string,
  leadId: string
): string {
  const who = leadName ?? 'Cliente'
  const treatment = treatmentName ?? 'Tratamiento no especificado'
  const date = new Date(appointmentDate).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
  return `✅ Cita confirmada: ${who}\nTratamiento: ${treatment}\nFecha: ${date}\nVer: ${APP_URL}/leads/${leadId}`
}

export function outOfHoursMessage(leadName: string | null, phone: string, text: string, leadId: string): string {
  const who = leadName ?? phone
  const preview = text.length > 100 ? text.slice(0, 100) + '…' : text
  return `📩 Mensaje fuera de horario de ${who}\n"${preview}"\nVer: ${APP_URL}/leads/${leadId}`
}
