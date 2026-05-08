import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  // TODO: verify Stripe webhook signature and handle events

  console.log('Stripe webhook received')
  return NextResponse.json({ ok: true })
}
