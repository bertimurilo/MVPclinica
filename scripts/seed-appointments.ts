#!/usr/bin/env node
/**
 * scripts/seed-appointments.ts
 *
 * Inserta 5 citas de prueba realistas en Supabase y (opcionalmente)
 * crea los eventos correspondientes en Google Calendar.
 *
 * Uso:
 *   npm run seed:appointments
 *
 * Variables requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Variables opcionales para Google Calendar:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   GOOGLE_CALENDAR_ID  (por defecto: mbertibusiness@gmail.com)
 *
 * Para obtener las credenciales de Google Calendar:
 *   1. Ejecuta: npx tsx scripts/auth-google-calendar.ts
 *   2. Sigue las instrucciones en consola
 *   3. Añade GOOGLE_REFRESH_TOKEN a .env.local
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? 'mbertibusiness@gmail.com'
const CLINIC_TIMEZONE = 'Europe/Madrid'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ─── Datos de prueba ──────────────────────────────────────────────────────────

interface AppointmentSeed {
  patientName: string
  patientPhone: string
  service: string
  durationMinutes: number
  price: number
  offsetDays: number
  hour: number
  minute: number
  status: 'agendada' | 'confirmada'
  notes: string
}

const SEED_DATA: AppointmentSeed[] = [
  {
    patientName: 'María García López',
    patientPhone: '+34612345678',
    service: 'Botox labios',
    durationMinutes: 45,
    price: 350,
    offsetDays: 1,
    hour: 10,
    minute: 0,
    status: 'agendada',
    notes: 'Primera visita. Interesada en aumento natural de labios.',
  },
  {
    patientName: 'Carmen Martínez Ruiz',
    patientPhone: '+34623456789',
    service: 'Hidratación facial con ácido hialurónico',
    durationMinutes: 60,
    price: 120,
    offsetDays: 2,
    hour: 11,
    minute: 30,
    status: 'confirmada',
    notes: 'Paciente habitual. Tratamiento de mantenimiento trimestral.',
  },
  {
    patientName: 'Laura Sánchez Pérez',
    patientPhone: '+34634567890',
    service: 'Láser depilación piernas completas',
    durationMinutes: 90,
    price: 180,
    offsetDays: 3,
    hour: 16,
    minute: 0,
    status: 'agendada',
    notes: 'Sesión 3 de 6. Piel sensible, usar parámetros reducidos.',
  },
  {
    patientName: 'Ana González Moreno',
    patientPhone: '+34645678901',
    service: 'Relleno de pómulos con ácido hialurónico',
    durationMinutes: 45,
    price: 450,
    offsetDays: 5,
    hour: 12,
    minute: 0,
    status: 'agendada',
    notes: 'Viene referida por Carmen Martínez. Solicita resultado muy natural.',
  },
  {
    patientName: 'Isabel Fernández Jiménez',
    patientPhone: '+34656789012',
    service: 'Peeling químico superficial',
    durationMinutes: 30,
    price: 95,
    offsetDays: 7,
    hour: 9,
    minute: 30,
    status: 'confirmada',
    notes: 'Tratamiento acné. Pago realizado por adelantado.',
  },
]

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function buildDate(offsetDays: number, hour: number, minute: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`
}

function formatEs(d: Date): string {
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CLINIC_TIMEZONE,
  })
}

// ─── Google Calendar ──────────────────────────────────────────────────────────

function buildCalendarClient(): calendar_v3.Calendar | null {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return null
  }
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })
  return google.calendar({ version: 'v3', auth })
}

interface CalendarResult {
  eventId: string | null
  link: string | null
}

async function createCalendarEvent(
  cal: calendar_v3.Calendar,
  seed: AppointmentSeed,
  startDate: Date,
): Promise<CalendarResult> {
  const endDate = new Date(startDate.getTime() + seed.durationMinutes * 60_000)

  const event: calendar_v3.Schema$Event = {
    summary: `${seed.status === 'confirmada' ? '✅' : '📋'} ${seed.service} — ${seed.patientName}`,
    description: [
      `Paciente: ${seed.patientName}`,
      `Teléfono: ${seed.patientPhone}`,
      `Servicio: ${seed.service}`,
      `Duración: ${seed.durationMinutes} min`,
      `Precio: ${seed.price}€`,
      `Estado: ${seed.status}`,
      '',
      `Notas: ${seed.notes}`,
      '',
      `Generado por Cliniq AI (seed script)`,
    ].join('\n'),
    start: { dateTime: toLocalIso(startDate), timeZone: CLINIC_TIMEZONE },
    end: { dateTime: toLocalIso(endDate), timeZone: CLINIC_TIMEZONE },
    // 2 = verde (confirmada), 5 = amarillo (agendada)
    colorId: seed.status === 'confirmada' ? '2' : '5',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'email', minutes: 24 * 60 },
      ],
    },
  }

  const res = await cal.events.insert({ calendarId: CALENDAR_ID, requestBody: event })
  return { eventId: res.data.id ?? null, link: res.data.htmlLink ?? null }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function findOrCreateClinic(): Promise<string> {
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name')
    .limit(1)
    .maybeSingle()

  if (clinic) {
    console.log(`✅  Clínica encontrada: ${clinic.name}`)
    return clinic.id
  }

  console.log('⚙️   No hay clínicas. Creando clínica de prueba...')
  const { data: newClinic, error } = await supabase
    .from('clinics')
    .insert({
      name: 'Clínica Estética Belleza Barcelona (TEST)',
      slug: 'clinica-test-seed',
      email: 'hola@clinica-test.es',
      phone: '+34930000000',
      city: 'Barcelona',
      active: true,
    })
    .select('id, name')
    .single()

  if (error || !newClinic) {
    console.error('❌  No se pudo crear la clínica de prueba:', error?.message)
    process.exit(1)
  }

  console.log(`✅  Clínica creada: ${newClinic.name}`)
  return newClinic.id
}

async function syncTreatments(clinicId: string): Promise<Record<string, string>> {
  const names = SEED_DATA.map((s) => s.service)

  // Buscar los que ya existen
  const { data: existing } = await supabase
    .from('treatments')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .in('name', names)

  const existingMap: Record<string, string> = {}
  for (const t of existing ?? []) {
    existingMap[t.name] = t.id
  }

  // Insertar los que faltan
  const missing = SEED_DATA.filter((s) => !existingMap[s.service])
  if (missing.length > 0) {
    const { data: inserted, error } = await supabase
      .from('treatments')
      .insert(
        missing.map((s) => ({
          clinic_id: clinicId,
          name: s.service,
          price: s.price,
          duration_minutes: s.durationMinutes,
          category: 'Medicina estética',
          active: true,
        })),
      )
      .select('id, name')

    if (error) {
      console.warn('⚠️   Error al crear tratamientos:', error.message)
    }
    for (const t of inserted ?? []) {
      existingMap[t.name] = t.id
    }
  }

  console.log(`✅  ${Object.keys(existingMap).length} tratamientos sincronizados`)
  return existingMap
}

async function upsertLead(clinicId: string, seed: AppointmentSeed): Promise<string | null> {
  const { data, error } = await supabase
    .from('leads')
    .upsert(
      {
        clinic_id: clinicId,
        phone: seed.patientPhone,
        name: seed.patientName,
        status: 'cita_agendada',
        qualification: 'caliente',
        conversation_stage: 'confirmed',
        source: 'seed',
        score: 80,
      },
      { onConflict: 'clinic_id,phone' },
    )
    .select('id')
    .single()

  if (error || !data) {
    console.error(`  ❌  Lead error (${seed.patientName}):`, error?.message)
    return null
  }
  return data.id
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface SeedResult {
  patientName: string
  service: string
  dateLabel: string
  appointmentId: string
  calendarLink: string | null
  status: string
}

async function main() {
  console.log('\n🌱  Cliniq AI — Seed de citas de prueba')
  console.log('═'.repeat(60))

  // 1. Clínica
  const clinicId = await findOrCreateClinic()

  // 2. Tratamientos
  const treatmentMap = await syncTreatments(clinicId)

  // 3. Google Calendar
  const calClient = buildCalendarClient()
  if (!calClient) {
    console.log('\n⚠️   Google Calendar NO configurado — solo se insertará en Supabase.')
    console.log('    Para activarlo, sigue los pasos en scripts/auth-google-calendar.ts\n')
  } else {
    console.log(`\n📆  Google Calendar listo (${CALENDAR_ID})\n`)
  }

  console.log('─'.repeat(60))
  console.log('📅  Insertando citas...\n')

  const results: SeedResult[] = []

  for (const seed of SEED_DATA) {
    const date = buildDate(seed.offsetDays, seed.hour, seed.minute)

    // Lead
    const leadId = await upsertLead(clinicId, seed)
    if (!leadId) continue

    // Appointment
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        clinic_id: clinicId,
        lead_id: leadId,
        treatment_id: treatmentMap[seed.service] ?? null,
        appointment_date: date.toISOString(),
        status: seed.status,
        notes: seed.notes,
        proposed_by: 'agent',
        requires_human_confirmation: seed.status === 'agendada',
      })
      .select('id')
      .single()

    if (apptErr || !appt) {
      console.error(`  ❌  Appointment error (${seed.patientName}):`, apptErr?.message)
      continue
    }

    // Google Calendar
    let calendarLink: string | null = null
    if (calClient) {
      try {
        const calResult = await createCalendarEvent(calClient, seed, date)
        calendarLink = calResult.link

        // Persistir en Supabase (requiere migración 20260526120000_google_calendar.sql)
        if (calResult.eventId || calResult.link) {
          await supabase
            .from('appointments')
            .update({ google_calendar_event_id: calResult.eventId, google_calendar_link: calResult.link })
            .eq('id', appt.id)
        }
      } catch (err) {
        console.warn(`  ⚠️   Google Calendar error: ${(err as Error).message}`)
      }
    }

    results.push({
      patientName: seed.patientName,
      service: seed.service,
      dateLabel: formatEs(date),
      appointmentId: appt.id,
      calendarLink,
      status: seed.status,
    })

    const icon = seed.status === 'confirmada' ? '🟢' : '🟡'
    process.stdout.write(`  ${icon} ${seed.patientName.padEnd(28)} → ${seed.service}\n`)
  }

  // ─── Resumen ───────────────────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(60))
  console.log(`✅  ${results.length}/5 citas insertadas correctamente\n`)

  for (const r of results) {
    const icon = r.status === 'confirmada' ? '🟢' : '🟡'
    console.log(`${icon}  ${r.patientName}`)
    console.log(`    📋 ${r.service}`)
    console.log(`    📅 ${r.dateLabel}`)
    console.log(`    🆔 Supabase: ${r.appointmentId}`)
    if (r.calendarLink) {
      console.log(`    📆 Google Calendar: ${r.calendarLink}`)
    }
    console.log()
  }

  if (!calClient) {
    console.log('─'.repeat(60))
    console.log('💡  Para añadir estas citas a Google Calendar:')
    console.log('    1. npx tsx scripts/auth-google-calendar.ts')
    console.log('    2. Añade GOOGLE_REFRESH_TOKEN a .env.local')
    console.log('    3. npm run seed:appointments\n')
  }
}

main().catch((err) => {
  console.error('\n❌  Error inesperado:', err)
  process.exit(1)
})
