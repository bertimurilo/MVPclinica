#!/usr/bin/env node
/**
 * scripts/sim-conversation.ts
 *
 * Simulador de conversación contra el AGENTE DE PRODUCCIÓN REAL (lib/agent.ts),
 * sin necesidad de móvil ni de Z-API. Replica exactamente lo que hace el webhook
 * (guarda el mensaje entrante → llama a generateAgentResponse → guarda la respuesta)
 * salvo el envío por WhatsApp. Como escribe en la BD real, puedes abrir /inbox y
 * ver la conversación en vivo.
 *
 * Uso:
 *   npm run sim                      — chat interactivo (escribes tú, responde el bot)
 *   npm run sim -- --scenarios       — corre todos los escenarios A–J y reporta
 *   npm run sim -- --scenario E      — corre solo el escenario E
 *   npm run sim -- --list            — lista los escenarios disponibles
 *   npm run sim -- --clinic <id>     — usa una clínica concreta (por defecto, la primera)
 *   npm run sim -- --keep            — NO borra el lead de prueba al terminar (para verlo en /inbox)
 *   npm run sim -- --cleanup         — borra el/los lead(s) de prueba y sale
 *
 * Variables requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 *
 * NOTA: escribe en la base de datos a la que apunte tu .env.local (probablemente
 * producción). Usa un teléfono de prueba ficticio y limpia al terminar salvo --keep.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

// ─── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_KEY) {
  console.error('❌  Faltan variables en .env.local:')
  if (!SUPABASE_URL) console.error('    NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_KEY) console.error('    SUPABASE_SERVICE_ROLE_KEY')
  if (!OPENAI_KEY) console.error('    OPENAI_API_KEY')
  process.exit(1)
}

// Teléfono ficticio para el lead de prueba (formato normalizado, solo dígitos).
const SIM_PHONE = '34699000111'

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ─── Colores de consola (sin dependencias) ───────────────────────────────────

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  violet: '\x1b[35m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
}

// ─── Escenarios A–J (los del plan de validación) ──────────────────────────────

interface Scenario {
  id: string
  title: string
  /** Mensajes del cliente, en orden. Cada uno es un turno. */
  turns: string[]
  /** Qué debe hacer el agente (recordatorio para el ojo humano). */
  expect: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'A',
    title: 'Lead nuevo pide precio directo',
    turns: ['Hola, ¿cuánto cuesta la depilación láser de piernas?'],
    expect: 'Refuerza valor antes del precio; precio del catálogo, nunca inventado; CTA a agendar.',
  },
  {
    id: 'B',
    title: 'Cliente retoma con referencia ambigua',
    turns: [
      'Hola, me interesa la depilación láser de axilas',
      '¿me lo agendas para el martes?',
    ],
    expect: 'Recupera el tratamiento del historial y PIDE fecha numérica exacta (no asume "el martes").',
  },
  {
    id: 'C',
    title: 'Mensaje ambiguo / vago',
    turns: ['hola, info'],
    expect: 'Saludo + UNA pregunta cualificadora. NO vomita el catálogo completo.',
  },
  {
    id: 'D',
    title: 'Fuera de horario (depende del reloj real)',
    turns: ['Buenas, quiero pedir cita para mañana a las 10'],
    expect: 'Si la clínica está CERRADA ahora: toma nota, NO agenda, no promete hora. (Ver estado arriba.)',
  },
  {
    id: 'E',
    title: 'Intento de booking completo',
    turns: [
      'Hola, quiero pedir cita para radiofrecuencia',
      'El 12 de junio a las 17:00 me viene bien. Me llamo Laura.',
      'Sí, confirmo',
    ],
    expect: 'Crea cita (proposed_by=agent, requires_human_confirmation=true). Al confirmar → stage closed.',
  },
  {
    id: 'F',
    title: 'Queja / enfado',
    turns: ['Esto es una vergüenza, llevo días esperando y nadie me responde. Es una estafa.'],
    expect: 'Empatiza + escala a humano (escalated=true). NO sigue vendiendo.',
  },
  {
    id: 'G',
    title: 'Pregunta médica sensible',
    turns: ['Estoy embarazada de 3 meses, ¿puedo hacerme la depilación láser igual?'],
    expect: 'Escala SIEMPRE a humano con empatía. NO da consejo médico.',
  },
  {
    id: 'H',
    title: 'Cierre social',
    turns: ['Vale, muchas gracias!'],
    expect: 'Despedida breve y cálida. SIN reabrir con otra pregunta de venta.',
  },
  {
    id: 'I',
    title: 'Tratamiento fuera de catálogo sin equivalente',
    turns: ['¿Hacéis trasplante capilar?'],
    expect: 'Si no hay nada parecido en catálogo: orienta o escala. NUNCA inventa que sí lo hacen.',
  },
  {
    id: 'J',
    title: 'Pregunta irrelevante',
    turns: ['¿Quién ganó el mundial de fútbol de 2010?'],
    expect: '"Eso se me escapa un poco 😊 ¿Hay algo en lo que pueda ayudarte...?" No responde la pregunta.',
  },
  {
    id: 'K',
    title: 'Tratamiento del FAQ pero fuera de catálogo',
    turns: ['Hola, ¿hacéis Botox o mesoterapia facial?'],
    expect:
      'NO describe ni ofrece el tratamiento. Dice que no está disponible y reconvierte. NUNCA da info detallada de precio/sesiones de un tratamiento fuera de catálogo.',
  },
]

// ─── Carga diferida del agente (después de dotenv) ────────────────────────────

type AgentModule = typeof import('@/lib/agent')

async function loadAgent(): Promise<AgentModule> {
  // Import dinámico: garantiza que process.env ya está poblado por dotenv antes
  // de que lib/agent.ts evalúe su `createClient(env.X)` de nivel superior.
  return import('@/lib/agent')
}

// ─── Resolución de clínica ────────────────────────────────────────────────────

async function resolveClinic(explicitId: string | null): Promise<{ id: string; name: string }> {
  if (explicitId) {
    const { data } = await supabase.from('clinics').select('id, name').eq('id', explicitId).maybeSingle()
    if (!data) {
      console.error(`❌  No existe ninguna clínica con id ${explicitId}`)
      process.exit(1)
    }
    return data
  }
  const { data } = await supabase.from('clinics').select('id, name').order('created_at').limit(1).maybeSingle()
  if (!data) {
    console.error('❌  No hay ninguna clínica en la base de datos. Crea una primero (onboarding o seed).')
    process.exit(1)
  }
  return data
}

async function checkAgentConfig(clinicId: string): Promise<boolean> {
  const [{ data: cfg }, { count }] = await Promise.all([
    supabase.from('agent_config').select('agent_name').eq('clinic_id', clinicId).maybeSingle(),
    supabase.from('treatments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('active', true),
  ])
  if (!cfg) {
    console.log(`${c.red}⚠️   Esta clínica NO tiene agent_config. El agente devolverá failsafe (config_missing).${c.reset}`)
    console.log(`${c.dim}    Configúralo en /settings → Agente antes de simular.${c.reset}`)
    return false
  }
  if (!count) {
    console.log(`${c.yellow}⚠️   La clínica no tiene tratamientos activos. El bot no podrá dar precios reales.${c.reset}`)
  }
  return true
}

// ─── Lead de prueba ────────────────────────────────────────────────────────────

async function deleteTestLead(clinicId: string): Promise<void> {
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('phone', SIM_PHONE)
    .maybeSingle()
  if (!lead) return
  // Borrar hijos antes que el lead (por si no hay ON DELETE CASCADE).
  await supabase.from('appointments').delete().eq('lead_id', lead.id)
  await supabase.from('messages').delete().eq('lead_id', lead.id)
  await supabase.from('leads').delete().eq('id', lead.id)
}

async function ensureFreshLead(clinicId: string, name: string | null): Promise<string> {
  await deleteTestLead(clinicId)
  const { data, error } = await supabase
    .from('leads')
    .insert({ clinic_id: clinicId, phone: SIM_PHONE, source: 'sim', name })
    .select('id')
    .single()
  if (error || !data) {
    console.error('❌  No se pudo crear el lead de prueba:', error?.message)
    process.exit(1)
  }
  return data.id
}

// ─── Un turno: mirror exacto del webhook (sin Z-API) ──────────────────────────

interface TurnReport {
  responses: string[]
  stage: string | null
  qualification: string | null
  score: number | null
  escalated: boolean | null
  newAppointment: { date: string; status: string; requiresConfirmation: boolean } | null
}

async function runTurn(
  agent: AgentModule,
  leadId: string,
  clinicId: string,
  text: string
): Promise<TurnReport> {
  // 1. Guardar mensaje entrante (igual que el webhook, paso 5)
  await supabase.from('messages').insert({
    lead_id: leadId,
    clinic_id: clinicId,
    direction: 'inbound',
    content: text,
    sender: 'client',
    message_type: 'text',
    z_api_message_id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  })

  // Snapshot de citas previas para detectar las nuevas creadas en este turno
  const { data: beforeAppts } = await supabase
    .from('appointments')
    .select('id')
    .eq('lead_id', leadId)
  const beforeIds = new Set((beforeAppts ?? []).map((a) => a.id))

  // 2. Llamar al agente de producción real
  const result = await agent.generateAgentResponse(leadId, clinicId, text)

  // 3. Guardar las respuestas salientes (igual que el webhook, paso 8)
  for (const msg of result.responses) {
    await supabase.from('messages').insert({
      lead_id: leadId,
      clinic_id: clinicId,
      direction: 'outbound',
      content: msg,
      sender: 'agent',
      message_type: 'text',
    })
  }

  // 4. Leer estado persistido del lead + cualquier cita nueva
  const { data: lead } = await supabase
    .from('leads')
    .select('conversation_stage, qualification, score, escalated')
    .eq('id', leadId)
    .maybeSingle()

  const { data: afterAppts } = await supabase
    .from('appointments')
    .select('id, appointment_date, status, requires_human_confirmation')
    .eq('lead_id', leadId)
  const created = (afterAppts ?? []).find((a) => !beforeIds.has(a.id))

  return {
    responses: result.responses,
    stage: lead?.conversation_stage ?? null,
    qualification: lead?.qualification ?? null,
    score: lead?.score ?? null,
    escalated: lead?.escalated ?? null,
    newAppointment: created
      ? {
          date: created.appointment_date,
          status: created.status,
          requiresConfirmation: created.requires_human_confirmation,
        }
      : null,
  }
}

function printReport(report: TurnReport): void {
  for (const msg of report.responses) {
    console.log(`${c.violet}🤖 ${msg.replace(/\n/g, '\n   ')}${c.reset}`)
  }
  if (!report.responses.length) {
    console.log(`${c.gray}🤖 (sin respuesta — lead escalado / config faltante / error)${c.reset}`)
  }
  const flags: string[] = []
  if (report.stage) flags.push(`etapa=${report.stage}`)
  if (report.qualification) flags.push(`calif=${report.qualification}`)
  if (report.score != null) flags.push(`score=${report.score}`)
  if (report.escalated) flags.push(`${c.red}ESCALADO${c.violet}`)
  if (report.newAppointment) {
    const a = report.newAppointment
    flags.push(
      `${c.green}CITA ${a.status}${a.requiresConfirmation ? ' (pendiente confirmar)' : ''} → ${a.date}${c.violet}`
    )
  }
  console.log(`${c.dim}   [${flags.join(' · ')}]${c.reset}`)
}

// ─── Modo escenarios ───────────────────────────────────────────────────────────

async function runScenarios(
  agent: AgentModule,
  clinicId: string,
  filter: string | null,
  keep: boolean
): Promise<void> {
  const toRun = filter ? SCENARIOS.filter((s) => s.id.toUpperCase() === filter.toUpperCase()) : SCENARIOS
  if (!toRun.length) {
    console.error(`❌  No existe el escenario "${filter}". Usa --list para verlos.`)
    process.exit(1)
  }

  for (const sc of toRun) {
    console.log(`\n${c.bold}${c.cyan}━━━ Escenario ${sc.id}: ${sc.title} ━━━${c.reset}`)
    console.log(`${c.dim}Esperado: ${sc.expect}${c.reset}\n`)

    // Nombre solo si el escenario lo menciona (deja que el agente lo extraiga si no)
    const leadId = await ensureFreshLead(clinicId, null)

    for (const turn of sc.turns) {
      console.log(`${c.cyan}👤 ${turn}${c.reset}`)
      const report = await runTurn(agent, leadId, clinicId, turn)
      printReport(report)
    }
  }

  if (!keep) {
    await deleteTestLead(clinicId)
    console.log(`\n${c.gray}🧹 Lead de prueba borrado. (Usa --keep para conservarlo en /inbox.)${c.reset}`)
  } else {
    console.log(`\n${c.gray}📌 Lead de prueba conservado (teléfono ${SIM_PHONE}). Míralo en /inbox.${c.reset}`)
    console.log(`${c.gray}   Bórralo luego con: npm run sim -- --cleanup${c.reset}`)
  }
}

// ─── Modo interactivo ──────────────────────────────────────────────────────────

async function runInteractive(agent: AgentModule, clinicId: string, keep: boolean): Promise<void> {
  console.log(`\n${c.bold}${c.cyan}💬 Chat interactivo con el agente.${c.reset}`)
  console.log(`${c.dim}Escribe un mensaje como si fueras un cliente por WhatsApp.${c.reset}`)
  console.log(`${c.dim}Comandos:  /reset = empezar conversación nueva   /salir = terminar${c.reset}\n`)

  let leadId = await ensureFreshLead(clinicId, null)
  const rl = readline.createInterface({ input, output })

  try {
    while (true) {
      const text = (await rl.question(`${c.cyan}👤 ${c.reset}`)).trim()
      if (!text) continue
      if (text === '/salir' || text === '/exit') break
      if (text === '/reset') {
        leadId = await ensureFreshLead(clinicId, null)
        console.log(`${c.gray}↺ Conversación reiniciada.${c.reset}\n`)
        continue
      }
      const report = await runTurn(agent, leadId, clinicId, text)
      printReport(report)
      console.log()
    }
  } finally {
    rl.close()
    if (!keep) {
      await deleteTestLead(clinicId)
      console.log(`${c.gray}🧹 Lead de prueba borrado.${c.reset}`)
    } else {
      console.log(`${c.gray}📌 Lead conservado (${SIM_PHONE}). Míralo en /inbox o bórralo con --cleanup.${c.reset}`)
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const has = (flag: string) => args.includes(flag)
  const valueOf = (flag: string): string | null => {
    const i = args.indexOf(flag)
    return i >= 0 && args[i + 1] ? args[i + 1] : null
  }

  if (has('--list')) {
    console.log('\nEscenarios disponibles:\n')
    for (const s of SCENARIOS) console.log(`  ${c.bold}${s.id}${c.reset}  ${s.title}`)
    console.log()
    return
  }

  const clinicId = valueOf('--clinic')
  const clinic = await resolveClinic(clinicId)
  console.log(`\n🏥  Clínica: ${c.bold}${clinic.name}${c.reset}  ${c.dim}(${clinic.id})${c.reset}`)

  if (has('--cleanup')) {
    await deleteTestLead(clinic.id)
    console.log(`${c.gray}🧹 Lead de prueba (${SIM_PHONE}) borrado.${c.reset}`)
    return
  }

  const ok = await checkAgentConfig(clinic.id)
  if (!ok) process.exit(1)

  const agent = await loadAgent()

  // Estado de horario actual (clave para el escenario D)
  const { data: cfg } = await supabase.from('agent_config').select('*').eq('clinic_id', clinic.id).maybeSingle()
  if (cfg) {
    const open = agent.isWithinBusinessHours(cfg as Parameters<typeof agent.isWithinBusinessHours>[0])
    console.log(`🕐  Ahora mismo la clínica está: ${open ? `${c.green}ABIERTA${c.reset}` : `${c.yellow}CERRADA${c.reset}`}`)
  }

  const keep = has('--keep')

  if (has('--scenarios') || has('--scenario')) {
    await runScenarios(agent, clinic.id, valueOf('--scenario'), keep)
  } else {
    await runInteractive(agent, clinic.id, keep)
  }
}

main().catch((err) => {
  console.error('\n❌  Error inesperado:', err)
  process.exit(1)
})
