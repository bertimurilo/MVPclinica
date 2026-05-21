import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServiceClient()
    const { data: userRow } = await serviceClient
      .from('users')
      .select('clinic_id')
      .eq('id', user.id)
      .single()
    if (!userRow?.clinic_id) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }
    const { data: clinic, error } = await serviceClient
      .from('clinics')
      .select('*')
      .eq('id', userRow.clinic_id)
      .single()

    if (error) throw error

    return NextResponse.json({ clinic })
  } catch (err) {
    console.error('GET /api/clinics error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ALLOWED_FIELDS = ['name', 'phone', 'address', 'agent_config']
    const body = await req.json() as Record<string, unknown>
    const safeBody = Object.fromEntries(
      Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key))
    )
    if (Object.keys(safeBody).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    const serviceClient = createServiceClient()
    const { data: userRow } = await serviceClient
      .from('users')
      .select('clinic_id')
      .eq('id', user.id)
      .single()
    if (!userRow?.clinic_id) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    const { data, error } = await serviceClient
      .from('clinics')
      .update(safeBody)
      .eq('id', userRow.clinic_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ clinic: data })
  } catch (err) {
    console.error('PATCH /api/clinics error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
