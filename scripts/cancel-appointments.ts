#!/usr/bin/env node
/**
 * scripts/cancel-appointments.ts
 *
 * Cancela (o elimina) las citas de prueba insertadas por el seed.
 *
 * Uso:
 *   npm run cancel:appointments           — marca status = "cancelada"
 *   npm run cancel:appointments -- --hard — elimina las filas definitivamente
 *
 * Variables requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const HARD_DELETE  = process.argv.includes('--hard')

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Faltan variables de entorno en .env.local:')
  if (!SUPABASE_URL) console.error('    NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_KEY)  console.error('    SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string
  status: string
  appointment_date: string
  leads: { name: string | null; phone: string | null } | null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mode = HARD_DELETE ? '🗑️  BORRADO TOTAL (--hard)' : '🚫  Cancelación (conserva historial)'
  console.log('\n🏥  Cliniq AI — Cancel Appointments')
  console.log(`    Modo: ${mode}`)
  console.log('═'.repeat(60))

  // 1. Obtener todas las clínicas
  const { data: clinics, error: clinicErr } = await supabase
    .from('clinics')
    .select('id, name')

  if (clinicErr) {
    console.error('❌  Error al consultar clínicas:', clinicErr.message)
    process.exit(1)
  }
  if (!clinics?.length) {
    console.log('✅  No hay clínicas en la base de datos.')
    return
  }

  if (clinics.length === 1) {
    console.log(`✅  Clínica: ${clinics[0].name}`)
  } else {
    console.log(`ℹ️   ${clinics.length} clínicas encontradas — se procesarán todas`)
    for (const c of clinics) console.log(`    • ${c.name}`)
  }

  const clinicIds = clinics.map(c => c.id)

  // 2. Buscar citas no canceladas
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('id, status, appointment_date, leads ( name, phone )')
    .in('clinic_id', clinicIds)
    .neq('status', 'cancelada')
    .order('appointment_date', { ascending: true })

  if (apptErr) {
    console.error('❌  Error al consultar citas:', apptErr.message)
    process.exit(1)
  }

  const appts = (appointments ?? []) as unknown as Appointment[]

  if (!appts.length) {
    console.log('\n✅  No hay citas pendientes que cancelar.')
    return
  }

  console.log(`\n📋  ${appts.length} cita(s) encontrada(s)\n`)
  console.log('─'.repeat(60))

  // 3. Procesar cada cita
  let ok = 0
  let failed = 0

  for (const appt of appts) {
    const name      = appt.leads?.name ?? appt.leads?.phone ?? '(sin nombre)'
    const dateLabel = new Date(appt.appointment_date).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    if (HARD_DELETE) {
      const { error } = await supabase.from('appointments').delete().eq('id', appt.id)
      if (error) {
        console.log(`  ❌  ${name.padEnd(28)} ${dateLabel}`)
        console.log(`       ${error.message}`)
        failed++
      } else {
        console.log(`  🗑️   ${name.padEnd(28)} ${dateLabel}`)
        ok++
      }
    } else {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelada' })
        .eq('id', appt.id)
      if (error) {
        console.log(`  ❌  ${name.padEnd(28)} ${dateLabel}`)
        console.log(`       ${error.message}`)
        failed++
      } else {
        console.log(`  ✅  ${name.padEnd(28)} ${dateLabel}`)
        ok++
      }
    }
  }

  // 4. Resumen
  console.log('\n' + '═'.repeat(60))
  const action = HARD_DELETE ? 'eliminadas' : 'canceladas'
  console.log(`✅  ${ok} cita(s) ${action} correctamente`)
  if (failed > 0) console.log(`❌  ${failed} cita(s) fallaron`)
  console.log()
}

main().catch((err) => {
  console.error('\n❌  Error inesperado:', err)
  process.exit(1)
})
