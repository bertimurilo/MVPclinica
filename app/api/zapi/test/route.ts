import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: userRow } = await serviceClient
    .from('users').select('clinic_id').eq('id', user.id).single()

  if (!userRow?.clinic_id) {
    return NextResponse.json({ success: false, connected: false, message: 'Clínica no encontrada' })
  }

  const { data: clinic } = await serviceClient
    .from('clinics')
    .select('z_api_instance_id, z_api_token, z_api_client_token')
    .eq('id', userRow.clinic_id)
    .single()

  if (!clinic?.z_api_instance_id || !clinic?.z_api_token) {
    return NextResponse.json({ success: false, connected: false, message: 'Credenciales no configuradas' })
  }

  const clientToken = clinic.z_api_client_token ?? process.env.Z_API_CLIENT_TOKEN
  const headers: Record<string, string> = clientToken
    ? { 'Client-Token': clientToken }
    : {}

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${clinic.z_api_instance_id}/token/${clinic.z_api_token}/status`,
      { headers }
    )
    const data = await res.json()
    const connected = data?.connected === true || data?.status === 'connected'

    await serviceClient
      .from('clinics')
      .update({ z_api_connected: connected, updated_at: new Date().toISOString() })
      .eq('id', userRow.clinic_id)

    return NextResponse.json({
      success: true,
      connected,
      message: connected
        ? 'WhatsApp conectado ✓'
        : 'Instancia no conectada — escanea el código QR',
    })
  } catch {
    return NextResponse.json({ success: false, connected: false, message: 'Error al contactar Z-API' })
  }
}
