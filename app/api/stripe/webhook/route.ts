import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const clinicId = session.metadata?.clinic_id
        if (!clinicId) break

        await supabase
          .from('clinics')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            active: true,
          })
          .eq('id', clinicId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const clinicId = sub.metadata?.clinic_id
        if (!clinicId) break

        const isActive = sub.status === 'active' || sub.status === 'trialing'
        await supabase
          .from('clinics')
          .update({ active: isActive })
          .eq('id', clinicId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const clinicId = sub.metadata?.clinic_id
        if (!clinicId) break

        await supabase
          .from('clinics')
          .update({ active: false, stripe_subscription_id: null })
          .eq('id', clinicId)
        break
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
