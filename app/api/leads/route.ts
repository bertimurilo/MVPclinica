import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl

    const clinicId = searchParams.get('clinic_id')
    const status   = searchParams.get('status')
    const limit    = Number(searchParams.get('limit') ?? '50')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinic_id required' }, { status: 400 })
    }

    const supabaseAuth = createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = rateLimit(user.id, 'leads-api', { interval: 60 * 1000, limit: 60 })
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones.' },
        { status: 429 }
      )
    }

    const { data: userRow } = await supabaseAuth
      .from('users')
      .select('clinic_id')
      .eq('id', user.id)
      .single()

    if (!userRow || userRow.clinic_id !== clinicId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceClient()

    let query = supabase
      .from('leads')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('last_message_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ leads: data ?? [] })
  } catch (err) {
    console.error('GET /api/leads error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>

    if (!body.clinic_id || !body.phone) {
      return NextResponse.json({ error: 'clinic_id and phone are required' }, { status: 400 })
    }

    const clinicId = body.clinic_id as string

    const supabaseAuth = createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = rateLimit(user.id, 'leads-api', { interval: 60 * 1000, limit: 60 })
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones.' },
        { status: 429 }
      )
    }

    const { data: userRow } = await supabaseAuth
      .from('users')
      .select('clinic_id')
      .eq('id', user.id)
      .single()

    if (!userRow || userRow.clinic_id !== clinicId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('leads')
      .insert({
        clinic_id: body.clinic_id,
        phone:     body.phone,
        name:      body.name ?? null,
        channel:   body.channel ?? 'web',
        status:    'nuevo',
        score:     0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ lead: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
