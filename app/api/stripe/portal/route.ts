import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clinic } = await supabase
    .from('users')
    .select('clinics(stripe_customer_id)')
    .eq('id', user.id)
    .single()

  const customerId = (clinic?.clinics as unknown as { stripe_customer_id: string | null } | null)
    ?.stripe_customer_id

  if (!customerId) {
    return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  try {
    const url = await createBillingPortalSession(customerId, `${baseUrl}/billing`)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: 'Error al abrir portal de facturación' }, { status: 500 })
  }
}
