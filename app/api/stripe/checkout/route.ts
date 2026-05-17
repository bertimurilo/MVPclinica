import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('clinic_id, clinics(email)')
    .eq('id', user.id)
    .single()

  if (!userData?.clinic_id) {
    return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 })
  }

  const clinicEmail =
    (userData.clinics as unknown as { email: string } | null)?.email ?? user.email ?? ''

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  try {
    const url = await createCheckoutSession(
      userData.clinic_id as string,
      clinicEmail,
      `${baseUrl}/billing?success=1`,
      `${baseUrl}/billing?canceled=1`
    )
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 })
  }
}
