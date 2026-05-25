import Stripe from 'stripe'
import { env } from '@/lib/env'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
    })
  }
  return _stripe
}

export const PLAN = {
  name: 'Venu Pro',
  price: 149,
  priceId: env.STRIPE_PRICE_ID,
  features: [
    'Agente IA por WhatsApp',
    'Leads y pipeline ilimitados',
    'Inbox unificado',
    'Dashboard y analíticas',
    'Configuración del agente',
    'Soporte incluido',
  ],
}

export async function createCheckoutSession(
  clinicId: string,
  clinicEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: clinicEmail,
    line_items: [{ price: PLAN.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { clinic_id: clinicId },
    subscription_data: { metadata: { clinic_id: clinicId } },
  })
  return session.url!
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}

export async function getSubscriptionStatus(subscriptionId: string) {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId)
  const item = sub.items.data[0]
  return {
    status: sub.status,
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  }
}
