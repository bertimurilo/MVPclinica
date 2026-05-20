import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: userRow } = await serviceClient
    .from('users').select('clinic_id').eq('id', user.id).single()

  if (!userRow?.clinic_id) {
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
  }

  const { data: clinic } = await serviceClient
    .from('clinics')
    .select('z_api_instance_id, z_api_token, z_api_client_token')
    .eq('id', userRow.clinic_id)
    .single()

  if (!clinic?.z_api_instance_id || !clinic?.z_api_token) {
    return NextResponse.json({ error: 'Credenciales no configuradas' }, { status: 400 })
  }

  const clientToken = clinic.z_api_client_token ?? process.env.Z_API_CLIENT_TOKEN
  const headers: Record<string, string> = clientToken
    ? { 'Client-Token': clientToken }
    : {}

  const base = `https://api.z-api.io/instances/${clinic.z_api_instance_id}/token/${clinic.z_api_token}`

  try {
    const qrRes = await fetch(`${base}/qr-code/image`, { headers })

    if (qrRes.ok) {
      const buffer = await qrRes.arrayBuffer()
      return new NextResponse(buffer, {
        headers: { 'Content-Type': qrRes.headers.get('Content-Type') ?? 'image/png' },
      })
    }

    // 400 = instance already connected — verify with status endpoint
    if (qrRes.status === 400) {
      const statusRes = await fetch(`${base}/status`, { headers })
      const statusData = await statusRes.json().catch(() => ({}))
      const alreadyConnected = statusData?.connected === true || statusData?.status === 'connected'

      if (alreadyConnected) {
        await serviceClient
          .from('clinics')
          .update({ z_api_connected: true, updated_at: new Date().toISOString() })
          .eq('id', userRow.clinic_id)

        return NextResponse.json({ alreadyConnected: true }, { status: 200 })
      }
    }

    const body = await qrRes.text()
    return NextResponse.json(
      { error: `Z-API respondió ${qrRes.status}`, detail: body },
      { status: qrRes.status }
    )
  } catch {
    return NextResponse.json({ error: 'Error al contactar Z-API' }, { status: 502 })
  }
}
