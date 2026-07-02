'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentClinicId, assertClinicActive } from '@/lib/actions'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import Anthropic from '@anthropic-ai/sdk'

export async function saveTreatment(formData: FormData) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }
  await assertClinicActive(clinicId)

  const id = formData.get('id') as string | null
  const name = ((formData.get('name') as string) ?? '').trim()
  const priceRaw = ((formData.get('price') as string) ?? '').trim()
  const durRaw = ((formData.get('duration_minutes') as string) ?? '').trim()

  if (name.length < 2) return { error: 'El nombre debe tener al menos 2 caracteres' }
  if (name.length > 100) return { error: 'El nombre no puede superar los 100 caracteres' }

  const price = priceRaw ? parseFloat(priceRaw) : null
  const duration_minutes = durRaw ? parseInt(durRaw, 10) : null

  if (price !== null && (isNaN(price) || price <= 0)) return { error: 'El precio debe ser mayor que 0' }
  if (duration_minutes !== null && (isNaN(duration_minutes) || duration_minutes <= 0)) return { error: 'La duración debe ser mayor que 0' }
  if (duration_minutes !== null && duration_minutes >= 480) return { error: 'La duración no puede superar las 8 horas (480 minutos)' }

  const row = {
    clinic_id: clinicId,
    name,
    description: ((formData.get('description') as string) ?? '').trim() || null,
    price,
    duration_minutes,
    category: ((formData.get('category') as string) ?? '').trim() || null,
    active: formData.get('active') === 'true',
  }

  const { error } = id
    ? await supabase.from('treatments').update(row).eq('id', id).eq('clinic_id', clinicId)
    : await supabase.from('treatments').insert(row)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteTreatment(id: string) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }
  await assertClinicActive(clinicId)

  const { error } = await supabase
    .from('treatments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function saveAgentConfig(formData: FormData) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }
  await assertClinicActive(clinicId)

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const businessHours: Record<string, { open: string; close: string } | null> = {}
  for (const day of days) {
    const enabled = formData.get(`bh_${day}_enabled`) === 'on'
    businessHours[day] = enabled
      ? {
          open: (formData.get(`bh_${day}_open`) as string) || '09:00',
          close: (formData.get(`bh_${day}_close`) as string) || '20:00',
        }
      : null
  }

  const row = {
    clinic_id: clinicId,
    tone: formData.get('tone') as string,
    welcome_message: formData.get('welcome_message') as string,
    fallback_message: formData.get('fallback_message') as string,
    out_of_hours_message: formData.get('out_of_hours_message') as string,
    escalation_rules: {
      unknown_question: formData.get('escalation_unknown') === 'on',
      surgery_mention: formData.get('escalation_surgery') === 'on',
      complaint: formData.get('escalation_complaint') === 'on',
    },
    business_hours: businessHours,
    max_auto_messages: Math.max(1, parseInt((formData.get('max_auto_messages') as string) || '10', 10) || 10),
    custom_instructions: (formData.get('custom_instructions') as string) || null,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('agent_config')
    .select('id')
    .eq('clinic_id', clinicId)
    .single()

  const { error } = existing
    ? await supabase.from('agent_config').update(row).eq('clinic_id', clinicId)
    : await supabase.from('agent_config').insert(row)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function saveClinicInfo(formData: FormData) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }

  const notificationPhone = (formData.get('notification_phone') as string)?.trim() || null

  const { error } = await supabase
    .from('clinics')
    .update({
      name: (formData.get('name') as string)?.trim(),
      email: (formData.get('email') as string)?.trim(),
      phone: (formData.get('phone') as string)?.trim(),
      address: (formData.get('address') as string)?.trim(),
      city: (formData.get('city') as string)?.trim(),
      notification_phone: notificationPhone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function updateWhatsAppStatus(connected: boolean) {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('clinics')
    .update({ z_api_connected: connected, updated_at: new Date().toISOString() })
    .eq('id', clinicId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// ─── Import treatments ────────────────────────────────────────────────────────

export type ParsedTreatment = {
  name: string
  price: number | null
  duration_minutes: number | null
  description: string | null
  category: string | null
}

function normHeader(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function findColIdx(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex(h => normHeader(h).includes(c))
    if (idx >= 0) return idx
  }
  return -1
}

function toPrice(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(',', '.').replace(/[€$\s]/g, ''))
  return isNaN(n) || n <= 0 ? null : n
}

function toDuration(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = parseInt(String(v))
  return isNaN(n) || n <= 0 ? null : n
}

function mapRows(headers: string[], dataRows: unknown[][]): ParsedTreatment[] {
  const nI = (() => { const i = findColIdx(headers, ['nombre', 'name', 'tratamiento', 'treatment', 'servicio']); return i >= 0 ? i : 0 })()
  const pI = (() => { const i = findColIdx(headers, ['precio', 'price', 'coste', 'cost', 'pvp', 'tarifa']); return i >= 0 ? i : 1 })()
  const dI = (() => { const i = findColIdx(headers, ['duracion', 'duration', 'minutos', 'minutes', 'min', 'tiempo']); return i >= 0 ? i : 2 })()
  const deI = (() => { const i = findColIdx(headers, ['descripcion', 'description', 'detalle', 'info']); return i >= 0 ? i : 3 })()
  const cI = (() => { const i = findColIdx(headers, ['categoria', 'category', 'tipo', 'type', 'area']); return i >= 0 ? i : 4 })()

  return dataRows
    .filter(row => String(row[nI] ?? '').trim().length > 0)
    .map(row => ({
      name: String(row[nI] ?? '').trim(),
      price: toPrice(row[pI]),
      duration_minutes: toDuration(row[dI]),
      description: String(row[deI] ?? '').trim() || null,
      category: String(row[cI] ?? '').trim() || null,
    }))
}

async function parsePdfBuffer(buffer: Buffer): Promise<ParsedTreatment[]> {
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
  const data = (await pdfParse(buffer)) as { text: string }
  const text = data.text?.trim()
  if (!text) throw new Error('No se pudo extraer texto del PDF')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    // claude-sonnet-4-20250514 está deprecado (retirada: 15 jun 2026) — alias actual.
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `Eres un asistente que extrae listas de tratamientos estéticos de texto sin estructurar.\nResponde ÚNICAMENTE con un array JSON válido, sin explicaciones ni markdown.\nCada objeto debe tener: { "name": string, "price": number|null, "duration_minutes": number|null, "description": string|null, "category": string|null }\nPara category, intenta clasificar en: "Facial", "Corporal", "Capilar", "Medicina estética" u "Otro".\nSi un campo no está disponible, usa null.`,
    messages: [{ role: 'user', content: text.slice(0, 50000) }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  try {
    return JSON.parse(cleaned) as ParsedTreatment[]
  } catch {
    throw new Error('La IA no devolvió un JSON válido. Intenta con un PDF más estructurado.')
  }
}

export async function parseTreatmentsFile(formData: FormData): Promise<{
  treatments?: ParsedTreatment[]
  error?: string
}> {
  const file = formData.get('file')
  if (!file || typeof file === 'string') return { error: 'No se recibió ningún archivo' }

  const blob = file as Blob
  const fileName = (file as File).name?.toLowerCase() ?? ''
  const buffer = Buffer.from(await blob.arrayBuffer())

  try {
    if (fileName.endsWith('.csv')) {
      const text = buffer.toString('utf-8')
      const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true })
      const rows = result.data as string[][]
      if (rows.length < 2) return { error: 'El CSV está vacío o solo tiene cabecera' }
      const headers = rows[0].map(h => h?.toString() ?? '')
      return { treatments: mapRows(headers, rows.slice(1)) }
    }

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
      if (rows.length < 2) return { error: 'El archivo Excel está vacío o solo tiene cabecera' }
      const headers = (rows[0] as unknown[]).map(h => String(h ?? ''))
      return { treatments: mapRows(headers, rows.slice(1) as unknown[][]) }
    }

    if (fileName.endsWith('.pdf')) {
      return { treatments: await parsePdfBuffer(buffer) }
    }

    return { error: 'Formato no soportado. Usa PDF, Excel (.xlsx/.xls) o CSV.' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al procesar el archivo' }
  }
}

export async function importTreatments(rows: ParsedTreatment[]): Promise<{
  inserted: number
  updated: number
  errors: string[]
}> {
  const supabase = createClient()
  const clinicId = await getCurrentClinicId()
  if (!clinicId) throw new Error('No autenticado')
  await assertClinicActive(clinicId)

  if (rows.length === 0) return { inserted: 0, updated: 0, errors: [] }
  if (rows.length > 500) throw new Error('El archivo contiene más de 500 tratamientos. Por favor divídelo en partes.')

  const { data: existing } = await supabase
    .from('treatments')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)

  const existingMap = new Map(
    (existing ?? []).map(t => [t.name.toLowerCase(), t.id as string])
  )

  let inserted = 0
  let updated = 0
  const errors: string[] = []
  const now = new Date().toISOString()

  for (const row of rows) {
    const name = (row.name ?? '').trim()

    if (name.length < 2) {
      errors.push(`"${row.name || '(vacío)'}": el nombre debe tener al menos 2 caracteres`)
      continue
    }
    if (name.length > 100) {
      errors.push(`"${name.slice(0, 30)}…": el nombre no puede superar los 100 caracteres`)
      continue
    }
    if (row.price !== null && row.price <= 0) {
      errors.push(`${name}: el precio debe ser mayor que 0`)
      continue
    }
    if (row.duration_minutes !== null && (row.duration_minutes <= 0 || row.duration_minutes >= 480)) {
      errors.push(`${name}: la duración debe estar entre 1 y 479 minutos`)
      continue
    }

    const existingId = existingMap.get(name.toLowerCase())
    const payload = {
      clinic_id: clinicId,
      name,
      price: row.price,
      duration_minutes: row.duration_minutes,
      description: (row.description ?? '').trim() || null,
      category: (row.category ?? '').trim() || null,
      updated_at: now,
    }

    if (existingId) {
      const { error } = await supabase.from('treatments').update(payload).eq('id', existingId)
      if (error) errors.push(`${name}: ${error.message}`)
      else updated++
    } else {
      const { error } = await supabase.from('treatments').insert({ ...payload, active: true })
      if (error) errors.push(`${name}: ${error.message}`)
      else inserted++
    }
  }

  revalidatePath('/settings')
  return { inserted, updated, errors }
}
