import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = req.nextUrl

    const clinicId = searchParams.get('clinic_id')
    const status   = searchParams.get('status')
    const limit    = Number(searchParams.get('limit') ?? '50')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinic_id required' }, { status: 400 })
    }

    let query = supabase
      .from('leads')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('last_contact_at', { ascending: false })
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
    const supabase = createServiceClient()
    const body = await req.json() as Record<string, unknown>

    if (!body.clinic_id || !body.phone) {
      return NextResponse.json({ error: 'clinic_id and phone are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        clinic_id: body.clinic_id,
        phone:     body.phone,
        name:      body.name ?? null,
        channel:   body.channel ?? 'web',
        status:    'new',
        score:     'cold',
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
