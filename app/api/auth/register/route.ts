import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = await rateLimit(ip, 'register', { interval: 15 * 60 * 1000, limit: 5 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429 }
    )
  }

  try {
    const { userId, email, clinicName } = await req.json()

    if (!userId || !email || !clinicName) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const slug =
      clinicName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now()

    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .insert({ name: clinicName, slug, email })
      .select('id')
      .single()

    if (clinicError || !clinic) {
      console.error('[register] clinic error:', clinicError)
      return NextResponse.json(
        { error: clinicError?.message ?? 'Error al crear la clínica' },
        { status: 500 }
      )
    }

    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      clinic_id: clinic.id,
      email,
      name: clinicName,
      role: 'admin',
    })

    if (userError) {
      console.error('[register] user error:', userError)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Crear configuración del agente con valores por defecto
    const { error: agentError } = await supabase
      .from('agent_config')
      .insert({
        clinic_id:            clinic.id,
        agent_name:           'Sara',
        tone:                 'profesional',
        welcome_message:      '¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte hoy?',
        fallback_message:     'Voy a pasar tu consulta a uno de nuestros especialistas. Te contactaremos enseguida.',
        out_of_hours_message: 'Gracias por escribirnos. Ahora mismo estamos fuera de horario, pero te responderemos en cuanto abramos.',
        escalation_rules:     { unknown_question: true, surgery_mention: true, complaint: true },
        business_hours: {
          monday:    { open: '09:00', close: '20:00' },
          tuesday:   { open: '09:00', close: '20:00' },
          wednesday: { open: '09:00', close: '20:00' },
          thursday:  { open: '09:00', close: '20:00' },
          friday:    { open: '09:00', close: '20:00' },
          saturday:  null,
          sunday:    null,
        },
        max_auto_messages:    10,
      })

    if (agentError) {
      console.error('Error creating agent_config:', agentError)
      // No bloqueamos el registro — la clínica puede configurarlo después
    }

    return NextResponse.json({ clinicId: clinic.id })
  } catch (err) {
    console.error('[register] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
