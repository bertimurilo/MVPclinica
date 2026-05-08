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
    const { data: clinic, error } = await serviceClient
      .from('clinics')
      .select('*')
      .eq('id', user.id)
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

    const body = await req.json() as Record<string, unknown>
    const serviceClient = createServiceClient()

    const { data, error } = await serviceClient
      .from('clinics')
      .update(body)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ clinic: data })
  } catch (err) {
    console.error('PATCH /api/clinics error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
