#!/usr/bin/env node
/**
 * scripts/sim-setup-testclinic.ts
 *
 * Prepara la clínica de prueba (la primera de la BD, la misma que usa `npm run sim`)
 * para poder validar los escenarios de booking/precio en limpio:
 *   - guarda un snapshot del horario y de los tratamientos existentes,
 *   - abre el horario 24/7 temporalmente,
 *   - añade un catálogo realista de tratamientos.
 *
 * `--restore` revierte TODO al snapshot: restaura el horario y borra solo los
 * tratamientos que este script añadió (los que no estaban en el snapshot).
 *
 * Uso:
 *   npm run sim:setup       — snapshot + abrir horario + catálogo realista
 *   npm run sim:setup -- --restore   — revertir al snapshot
 *
 * NOTA: solo tocar en la clínica de PRUEBA. Escribe en la BD de .env.local.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const SNAPSHOT_PATH = path.join(process.cwd(), 'scripts', '.testclinic-snapshot.json')
const RESTORE = process.argv.includes('--restore')

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const ALL_OPEN = Object.fromEntries(DAYS.map((d) => [d, { open: '00:00', close: '23:59' }]))

// Catálogo realista para una clínica estética
const CATALOG = [
  { name: 'Depilación láser piernas completas', price: 180, duration_minutes: 45, category: 'Depilación' },
  { name: 'Depilación láser axilas', price: 40, duration_minutes: 15, category: 'Depilación' },
  { name: 'Radiofrecuencia facial', price: 90, duration_minutes: 45, category: 'Facial' },
  { name: 'Hidratación facial', price: 70, duration_minutes: 60, category: 'Facial' },
  { name: 'Presoterapia', price: 50, duration_minutes: 45, category: 'Corporal' },
]

interface Snapshot {
  clinicId: string
  clinicName: string
  businessHours: unknown
  treatmentIds: string[]
  takenAt: string
}

async function resolveClinic(): Promise<{ id: string; name: string }> {
  const { data } = await supabase.from('clinics').select('id, name').order('created_at').limit(1).maybeSingle()
  if (!data) {
    console.error('❌  No hay clínicas en la BD.')
    process.exit(1)
  }
  return data
}

async function setup() {
  if (fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`❌  Ya existe un snapshot en ${SNAPSHOT_PATH}.`)
    console.error('    Ejecuta primero "npm run sim:setup -- --restore" para revertir, o bórralo manualmente.')
    process.exit(1)
  }

  const clinic = await resolveClinic()
  console.log(`🏥  Clínica de prueba: ${clinic.name} (${clinic.id})`)

  const { data: cfg } = await supabase
    .from('agent_config')
    .select('business_hours')
    .eq('clinic_id', clinic.id)
    .maybeSingle()
  const { data: existing } = await supabase.from('treatments').select('id').eq('clinic_id', clinic.id)

  const snapshot: Snapshot = {
    clinicId: clinic.id,
    clinicName: clinic.name,
    businessHours: cfg?.business_hours ?? null,
    treatmentIds: (existing ?? []).map((t) => t.id),
    takenAt: new Date().toISOString(),
  }
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2))
  console.log(`📸  Snapshot guardado (${snapshot.treatmentIds.length} tratamientos previos, horario original).`)

  // Abrir horario 24/7
  await supabase.from('agent_config').update({ business_hours: ALL_OPEN }).eq('clinic_id', clinic.id)
  console.log('🕐  Horario abierto 24/7 (temporal).')

  // Añadir catálogo (solo los que no existan ya por nombre)
  const { data: current } = await supabase.from('treatments').select('name').eq('clinic_id', clinic.id)
  const have = new Set((current ?? []).map((t) => (t.name as string).toLowerCase()))
  const toInsert = CATALOG.filter((t) => !have.has(t.name.toLowerCase()))
  if (toInsert.length) {
    await supabase.from('treatments').insert(toInsert.map((t) => ({ ...t, clinic_id: clinic.id, active: true })))
  }
  console.log(`💉  Catálogo añadido: ${toInsert.length} tratamientos nuevos.`)
  console.log('\n✅  Listo. Ahora: npm run sim -- --scenarios')
}

async function restore() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(`❌  No hay snapshot en ${SNAPSHOT_PATH}. Nada que revertir.`)
    process.exit(1)
  }
  const snapshot: Snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'))
  console.log(`🏥  Restaurando ${snapshot.clinicName} (${snapshot.clinicId})`)

  // Restaurar horario
  await supabase.from('agent_config').update({ business_hours: snapshot.businessHours }).eq('clinic_id', snapshot.clinicId)
  console.log('🕐  Horario original restaurado.')

  // Borrar solo los tratamientos añadidos (los que NO estaban en el snapshot)
  const { data: current } = await supabase.from('treatments').select('id').eq('clinic_id', snapshot.clinicId)
  const original = new Set(snapshot.treatmentIds)
  const added = (current ?? []).map((t) => t.id).filter((id) => !original.has(id))
  if (added.length) {
    // Borrar primero cualquier cita ligada a esos tratamientos para no romper FKs
    await supabase.from('appointments').delete().in('treatment_id', added)
    await supabase.from('treatments').delete().in('id', added)
  }
  console.log(`💉  ${added.length} tratamientos añadidos por el setup borrados.`)

  fs.unlinkSync(SNAPSHOT_PATH)
  console.log('🧹  Snapshot eliminado. Clínica de prueba revertida a su estado original.')
}

;(RESTORE ? restore() : setup()).catch((err) => {
  console.error('\n❌  Error:', err)
  process.exit(1)
})
