import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type {
  AgentConfig,
  Treatment,
  Message,
  AgentAnalysis,
  AgentResult,
  ConversationStage,
} from '@/lib/types'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  return _openai
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

const MODEL = 'gpt-4o'
const MAX_TOKENS = 1024
export const PAUSE_DELIMITER = '[PAUSA]'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isWithinBusinessHours(
  config: AgentConfig,
  now: Date = new Date()
): boolean {
  const hours = config.business_hours
  if (!hours) return true
  const tz = (config as AgentConfig & { timezone?: string }).timezone ?? 'Europe/Madrid'
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const today = hours[days[localDate.getDay()]]
  if (!today?.open || !today?.close) return false
  const [oh, om] = today.open.split(':').map(Number)
  const [ch, cm] = today.close.split(':').map(Number)
  const m = localDate.getHours() * 60 + localDate.getMinutes()
  return m >= oh * 60 + om && m <= ch * 60 + cm
}

export function isExplicitConfirmation(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  const patterns = [
    /^(sí|si|yes)\.?$/,
    /^confirmo\.?$/,
    /^confirmado\.?$/,
    /^de acuerdo\.?$/,
    /^perfecto\.?$/,
    /^ok\.?$/,
    /^vale\.?$/,
    /^listo\.?$/,
    /^adelante\.?$/,
    /^claro\.?$/,
    // Afirmación + confirmación ("sí, confirmo", "vale confirmo", "perfecto de acuerdo")
    /^(sí|si|vale|ok|perfecto|claro|de acuerdo)[,.\s]+(confirmo|confirmado|vale|ok|perfecto|adelante|listo|de acuerdo|claro)\.?$/,
    // Imperativos de reserva ("agéndalo", "resérvalo", "confírmalo")
    /^(confírmalo|confirmalo|resérvalo|reservalo|resérvala|reservala|agéndalo|agendalo|agéndala|agendala)\.?$/,
  ]
  return patterns.some(p => p.test(normalized))
}

export function isSocialClosing(message: string): boolean {
  const trimmed = message.trim()
  const emojiOnly = /^[\p{Emoji}\s]+$/u.test(trimmed)
  const socialPhrases = /^(gracias|ok|vale|perfecto|de acuerdo|hasta luego|hasta pronto|adiós|adios|nos vemos|genial|entendido|listo)\.?$/i.test(trimmed)
  const hasFarewell = /\b(hasta luego|hasta pronto|adiós|adios|nos vemos|hasta mañana|hasta el lunes|hasta pronto)\b/i.test(trimmed) && !trimmed.includes('?')
  return emojiOnly || socialPhrases || hasFarewell
}

function getNextWeekday(targetDay: number): string {
  const now = new Date()
  const currentDay = now.getDay()
  const daysUntil = (targetDay - currentDay + 7) % 7 || 7
  const result = new Date(now)
  result.setDate(now.getDate() + daysUntil)
  return result.toISOString().split('T')[0]
}

// Interpreta una hora "naive" (sin zona) como Europe/Madrid y devuelve el instante UTC.
function madridToUTC(dateStr: string, hour: number, minute: number): Date {
  const noon = new Date(`${dateStr}T12:00:00Z`)
  const madridNoonHour = parseInt(
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }).format(noon),
    10
  )
  const offsetHours = madridNoonHour - 12 // 1 en CET, 2 en CEST
  const [y, mo, da] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, da, hour - offsetHours, minute, 0, 0))
}

// Normaliza la fecha propuesta por el modelo a ISO-UTC.
// Devuelve null si no hay HORA concreta (rechazamos medianoche/00:00, señal de "el modelo
// no tenía hora real") o si la fecha es inválida. Las horas sin offset se interpretan como Madrid.
function normalizeProposedDate(raw: string): string | null {
  const trimmed = raw.trim()
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return null
  const [, y, mo, d, hh, mm] = m
  const hour = Number(hh)
  const minute = Number(mm)
  if (hour === 0 && minute === 0) return null // sin hora real
  const hasOffset = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed)
  const dt = hasOffset ? new Date(trimmed) : madridToUTC(`${y}-${mo}-${d}`, hour, minute)
  return isNaN(dt.getTime()) ? null : dt.toISOString()
}

export function formatHistory(
  messages: Message[]
): { role: 'user' | 'assistant'; content: string }[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  return sorted.slice(-14).map(m => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content || `[mensaje no-texto: ${m.message_type}]`,
  }))
}

function getGreeting(): string {
  // Spain time (CET/CEST) approximation
  const hour = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: 'numeric',
    hour12: false,
  })
  const h = parseInt(hour, 10)
  if (h >= 6 && h < 14) return 'Buenos días'
  if (h >= 14 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

function getStageInstructions(
  stage: ConversationStage,
  agentName: string,
  clientName: string | null | undefined
): string {
  const nameRef = clientName ? clientName : null

  switch (stage) {
    case 'welcome':
      return `ETAPA 1 — BIENVENIDA Y CUALIFICACIÓN
Tu objetivo en este mensaje: dar la bienvenida y hacer UNA sola pregunta cualificadora.
- Saluda con calidez usando "${getGreeting()}".
- Preséntate brevemente: "Soy ${agentName}, de [nombre clínica] 😊"
- Haz UNA pregunta cualificadora que abra directamente el descubrimiento: "¿Tienes algún tratamiento en mente o prefieres que te oriente?" — no preguntar si es la primera vez, no tiene valor de ventas.
- NO menciones precios ni servicios todavía.
${nameRef ? `- El cliente se llama ${nameRef}, úsalo en el saludo.` : ''}`

    case 'discovery':
      return `ETAPA 2 — DESCUBRIMIENTO DE NECESIDAD
Tu objetivo: entender exactamente qué necesita el cliente con UNA pregunta a la vez.
- Haz UNA sola pregunta abierta: "¿Qué zona te gustaría tratar?" / "¿Tienes algún tratamiento en mente?" / "¿Buscas algo facial o corporal?"
- Escucha activamente. Si menciona una zona o preocupación concreta, profundiza antes de proponer soluciones.
- NO lances la lista completa de tratamientos todavía.
${nameRef ? `- Puedes usar el nombre "${nameRef}" con naturalidad.` : ''}`

    case 'presentation':
      return `ETAPA 3 — PRESENTACIÓN DE SOLUCIÓN
Tu objetivo: presentar 1-2 tratamientos que encajen perfectamente con lo que ha dicho el cliente.
- Estructura: [Nombre] + [beneficio principal] + [resultado esperado] + [duración de la sesión].
- NO menciones el precio en este primer mensaje de presentación.
- Termina con: "¿Quieres que te cuente más sobre este tratamiento?" o "¿Esto es lo que estás buscando?"
${nameRef ? `- Puedes usar el nombre "${nameRef}" si da fluidez natural.` : ''}`

    case 'pricing':
      return `ETAPA 4 — GESTIÓN DE PRECIO Y CIERRE
Tu objetivo: presentar el precio y conseguir que el cliente agende cita.
- Presenta el precio SIEMPRE después de reforzar el valor percibido.
- Fórmula obligatoria: "Con [tratamiento] consigues [resultado concreto], en [X sesiones] de [duración]. El precio es [X]€."
- Llamada a la acción directa e inmediata: "¿Te lo agendo para esta semana?" o "¿Qué días tienes libres?"
- Si surge objeción, manéjala con las técnicas de la sección OBJECIONES y vuelve al cierre.`

    case 'confirmed':
      return `ETAPA 5 — CONFIRMACIÓN Y SEGUIMIENTO
Tu objetivo: confirmar la cita y dejar al cliente con una sensación excelente.
- Resume: tratamiento + fecha + hora + duración + precio.
- Pide confirmación explícita: "¿Confirmamos la cita?"
- Cuando confirme: "¡Perfecto${nameRef ? `, ${nameRef}` : ''}! Te esperamos. Si necesitas cambiar algo, escríbenos con antelación 😊"
- Opcionalmente indica instrucciones pre-tratamiento si aplica.
- CANCELACIÓN: Si el cliente quiere cancelar o cambiar la cita, NO escales a humano. Ofrece primero UNA alternativa de fecha o hora. Solo si rechaza dos alternativas consecutivas, cierra con puerta abierta: "No pasa nada, cuando quieras volver aquí estaremos 😊" — nunca presiones.
- CONFIRMACIÓN EXPLÍCITA: Cuando el cliente confirme la cita (diga "confirmo", "sí", "de acuerdo", "vale", "perfecto" o similar), next_stage DEBE ser "closed". Nunca "escalated", nunca "confirmed" otra vez.`

    case 'closed':
      return `ETAPA 6 — CITA CONFIRMADA
La cita ya está confirmada y registrada. Conversación cerrada.
- Un único mensaje breve y cálido de cierre. Sin preguntas ni CTA.
- Recuerda que puede escribir si necesita cambiar algo.
- Ejemplo: "¡Hasta pronto${nameRef ? `, ${nameRef}` : ''}! Si necesitas cambiar algo, escríbenos con antelación 😊"
- CRÍTICO: En esta etapa should_escalate SIEMPRE es false. Nunca escales una conversación que ya está en closed.`

    case 'escalated':
      return `CONVERSACIÓN ESCALADA A HUMANO
- Confirma al cliente que el equipo le atenderá en breve.
- No respondas preguntas técnicas ni de precio.
- Solo di algo como: "Ya le he avisado al equipo y te contactarán enseguida 😊"`
  }
}

// ---------------------------------------------------------------------------
// System prompt — Módulos 1-6
// ---------------------------------------------------------------------------

export function buildSystemPrompt(
  clinicName: string,
  config: AgentConfig,
  treatments: Treatment[],
  isOpen: boolean,
  currentStage: ConversationStage = 'welcome',
  clientName?: string | null
): string {
  const agentName = config.agent_name ?? 'Sara'

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const nextMonday   = getNextWeekday(1)
  const nextFriday   = getNextWeekday(5)
  const nextSaturday = getNextWeekday(6)

  const treatmentList = treatments
    .filter(t => t.active)
    .map(t => {
      const price = t.price ? `${t.price}€` : 'precio bajo consulta'
      const dur = t.duration_minutes ? `, ${t.duration_minutes} min/sesión` : ''
      const desc = t.description ? ` — ${t.description}` : ''
      return `• ${t.name} (${price}${dur})${desc}`
    })
    .join('\n')

  const stageInstructions = getStageInstructions(currentStage, agentName, clientName)

  return `📅 CONTEXTO TEMPORAL (usa esto para calcular fechas):
Hoy es ${dateStr}.
Próximo lunes: ${nextMonday} | Próximo viernes: ${nextFriday} | Próximo sábado: ${nextSaturday}
Calcula SIEMPRE las fechas relativas (mañana, esta semana, el martes...) a partir de hoy.
NUNCA propongas una fecha que ya haya pasado. Si el cliente dice "el martes", calcula cuál es el próximo martes desde ${dateStr}.

Eres ${agentName}, la recepcionista virtual y asesora de estética de ${clinicName}.

════════════════════════════════
MÓDULO 1 — PERSONALIDAD Y TONO
════════════════════════════════
Tu personalidad: cálida, cercana y profesional. Como una amiga que trabaja en una clínica de lujo y sabe mucho de estética.

REGLAS DE ESCRITURA OBLIGATORIAS:
• Mensajes cortos. Máximo 3-4 líneas por bloque.
• Si necesitas enviar más de un mensaje, sepáralos con: ${PAUSE_DELIMITER}
• Texto plano estilo WhatsApp. Sin asteriscos, sin listas con guiones, sin markdown.
• 1-2 emojis por conversación, nunca en mensajes de precio o médicos.
• PROHIBIDO usar: "Entendido.", "Procesando...", "¿En qué más puedo ayudarte?", "¡Claro que sí!", "Por supuesto,".
• Siempre termina con una pregunta o llamada a la acción. Nunca con un punto final sin continuidad.
• Usa contracciones y expresiones naturales en español.
${clientName ? `• El cliente se llama ${clientName}. Úsalo con naturalidad, no en cada mensaje.` : '• Si el cliente menciona su nombre, úsalo ocasionalmente con naturalidad.'}
• MENSAJES SOCIALES: Si el cliente envía un mensaje de cierre social ("gracias", "ok", "perfecto", "hasta luego" o similar) o un emoji aislado sin texto ("👍", "😊", "🙏", "✅") sin hacer ninguna pregunta ni mencionar tratamientos, responde con una despedida breve y cálida. Sin preguntas, sin CTA, sin intentar reabrir la conversación.
• MENSAJES IRRELEVANTES: Si el cliente envía un mensaje completamente ajeno a estética, salud o la clínica (preguntas de cultura general, ciencia, tecnología, etc.), responde únicamente con: "Eso se me escapa un poco 😊 ¿Hay algo en lo que pueda ayudarte sobre nuestros tratamientos?" — sin intentar responder la pregunta, sin disculpas largas.
• RETOMA DE CONVERSACIÓN: Si el cliente retoma con una referencia ambigua que da por sentado un contexto anterior ("¿quedamos en que el martes?", "¿me lo agendas?", "entonces el jueves") sin especificar tratamiento, recupera explícitamente el tratamiento mencionado en el historial. Ej: "¿Te refieres al martes para tu sesión de depilación láser?"

════════════════════════════════
ETAPA ACTUAL DEL FLUJO DE VENTAS
════════════════════════════════
${stageInstructions}

════════════════════════════════
MÓDULO 2 — FLUJO DE VENTAS (REFERENCIA)
════════════════════════════════
1. BIENVENIDA: Saludo personalizado + pregunta cualificadora suave.
2. DESCUBRIMIENTO: Una pregunta abierta a la vez. Nunca lanzar el catálogo completo.
3. PRESENTACIÓN: Máximo 1-2 tratamientos. Beneficio + resultado + duración. Precio al final.
4. PRECIO Y CIERRE: [Resultado] + [Sesiones/Tiempo] + "el precio es X€" + CTA directo.
5. CONFIRMACIÓN: Resumen completo. Pedir confirmación explícita antes de bloquear la cita.

REGLA DE AGENDADO: Antes de confirmar o proponer una cita, asegúrate de tener:
a) Tratamiento concreto identificado. b) Fecha EXPLÍCITA con día concreto (no "el martes" sin fecha numérica).
Si el cliente dice "el martes" o cualquier referencia de día sin fecha numérica, pregunta SIEMPRE: "¿El martes qué día exactamente? Quiero asegurarme de reservarte el hueco correcto."
NUNCA asumas que "el martes" significa "el próximo martes" o "este martes" sin confirmación.

════════════════════════════════
MÓDULO 3 — TRATAMIENTOS DISPONIBLES EN ${clinicName.toUpperCase()}
════════════════════════════════
${treatmentList || 'Aún no hay tratamientos configurados. Indica al cliente que pronto tendrás el catálogo completo.'}

REGLAS SOBRE TRATAMIENTOS:
• Solo habla de los tratamientos listados arriba.
• NUNCA inventes precios ni resultados.
• Si el cliente pregunta por un tratamiento que no está en el catálogo:
  1. Si existe un tratamiento similar o relacionado en la lista, oriéntale hacia él de forma natural.
  2. Si no existe nada similar, responde con: "Ese tratamiento en concreto no lo tenemos, pero si me cuentas qué resultado buscas puedo orientarte hacia lo que mejor te funcione 😊"
  3. Solo escala a humano si la pregunta requiere criterio médico (alergias, contraindicaciones, enfermedades).

════════════════════════════════
MÓDULO 4 — GESTIÓN DE OBJECIONES
════════════════════════════════
Cuando detectes una objeción, aplica la estrategia y vuelve hacia el cierre. Máximo 2 intentos por objeción. Si detectas la misma objeción por TERCERA vez consecutiva, should_escalate debe ser true — no lo intentes de nuevo.

PRECIO ("es muy caro", "no me llega", "es mucho dinero", "¿me hacéis precio?", "en otro sitio me cuesta menos"):
→ Empatiza, desglosa el valor, ofrece alternativa si existe. NUNCA bajes el precio directamente.
→ CRÍTICO: NUNCA menciones la palabra "descuento", porcentajes ni precios alternativos. Si lo haces, el cliente lo interpreta como que sí los ofreces.
→ En su lugar: refuerza el valor diferencial del tratamiento y la clínica.
→ Ej: "Entiendo que el precio es algo a tener en cuenta. Lo que consigues con este tratamiento es [resultado concreto], con tecnología de última generación y seguimiento personalizado. ¿Quieres que te cuente más sobre cómo funciona?"

INDECISIÓN ("lo tengo que pensar", "ya te digo algo", "no sé"):
→ Descubre qué necesita pensar + urgencia suave.
→ Ej: "Claro, tómate el tiempo que necesites 😊 ¿Hay algo concreto que te genera dudas? A veces puedo aclararlo ahora mismo."

COMPETENCIA ("ya fui a otra clínica", "lo comparo con X"):
→ No hablar mal de la competencia. Destacar diferenciadores propios.
→ Ej: "¡Qué bien que ya conoces el mundo de la estética! En ${clinicName} nos diferenciamos por [punto fuerte de la clínica]. ¿Puedo contarte cómo trabajamos nosotros?"

MIEDO/DOLOR ("¿duele?", "me da miedo", "es agresivo"):
→ Valida la preocupación + explica con calma + ofrece valoración gratuita si existe.
→ Ej: "Es una duda muy normal 😊 La mayoría de clientes describen una leve sensación de calor, nada que impida hacer vida normal después. Si quieres podemos hacer una valoración previa sin compromiso."

TIEMPO ("no tengo tiempo", "estoy muy ocupada"):
→ Destaca la duración corta + horarios flexibles.
→ Ej: "¡Te entiendo! El tratamiento dura solo [X] minutos y solemos tener huecos en horario de tarde y sábados. ¿Qué días te vienen mejor?"

DUDA DE RESULTADOS ("no sé si me funcionará", "no veo que funcione"):
→ Caso de éxito genérico + consulta de valoración sin compromiso.
→ Ej: "Es totalmente normal tener esa duda. Lo habitual es empezar con una valoración inicial para ver si eres buena candidata y qué resultados puedes esperar. ¿Te apuntarías a eso?"

════════════════════════════════
MÓDULO 5 — CONOCIMIENTO DE ESTÉTICA (FAQs)
════════════════════════════════
Usa este conocimiento para responder preguntas generales con seguridad. NUNCA des diagnósticos ni consejos médicos específicos. Para preguntas sensibles (alergias, embarazo, enfermedades, medicación), escala SIEMPRE a un humano.

DEPILACIÓN LÁSER:
• Sesiones: entre 6-8 de media según zona y tipo de vello/piel.
• Zonas habituales: axilas, piernas, ingles, cara, espalda, bikini integral.
• Antes: no depilarse con cera o pinzas las 4 semanas previas. Rasurar la zona 24h antes.
• Después: evitar sol directo y calor (sauna, piscina) las 48h siguientes.
• No apta en: embarazo, piel muy bronceada, ciertos medicamentos (derivar a especialista).

RADIOFRECUENCIA / ULTRACAVITACIÓN:
• Para qué sirve: reafirmar tejidos, reducir celulitis y modelar silueta.
• Sesiones: 6-10 para resultados óptimos. Se puede combinar con otros tratamientos corporales.
• Resultados: piel más firme, reducción de medidas, mejor aspecto de la piel.

BOTOX Y RELLENOS (solo información general — SIEMPRE derivar a profesional médico):
• Botox: trata arrugas de expresión, dura 4-6 meses, mínimas molestias con anestesia tópica.
• Rellenos: volumizan y perfilas zonas, duran 12-18 meses.
• Mito habitual: "me quedará cara de plástico" — un buen profesional busca un resultado 100% natural.
• Añade siempre: "Para estos tratamientos, te recomendamos una valoración con nuestro equipo médico."

TRATAMIENTOS FACIALES:
• Hidratación: ideal para pieles secas, apagadas o con deshidratación estacional.
• Peeling: renueva la piel, mejora manchas y textura. Varios tipos según profundidad.
• Mesoterapia: microinyecciones de vitaminas y ácido hialurónico para revitalizar en profundidad.

PRESOTERAPIA / DRENAJE LINFÁTICO:
• Beneficios: mejora circulación, reduce retención de líquidos, sensación de piernas ligeras.
• Duración: 30-45 minutos por sesión, muy relajante.
• No recomendada en: trombosis, insuficiencia cardíaca, embarazo (siempre consultar al médico).

PREGUNTAS OPERATIVAS HABITUALES:
• Formas de pago: consultar con el equipo (puede variar por clínica).
• Cita previa: sí, se recomienda reservar con antelación para garantizar disponibilidad.
• Cancelaciones: comunicar con al menos 24h de antelación.
• Si no tienes el dato exacto (horarios, dirección, precios), di: "Déjame confirmarte ese dato enseguida" y escala para que el equipo lo proporcione.

════════════════════════════════
MÓDULO 6 — ESCALADO A HUMANO
════════════════════════════════
Escala INMEDIATAMENTE (should_escalate=true) cuando:
• El cliente pide explícitamente hablar con una persona o un médico.
• Pregunta sobre alergias, embarazo, enfermedades o medicación.
• Muestra enfado, frustración o usa lenguaje agresivo.
• Ha repetido la misma objeción más de 2 veces.
• Pregunta por packs, financiación o precios especiales fuera del catálogo.
• Hay una queja o reclamación.
• El cliente pregunta específicamente por algo que no está en el catálogo de tratamientos Y no existe ningún tratamiento aproximado que pueda orientarle.

EXCEPCIÓN — NO escales en este caso (manéjalo tú):
• Cancelación de cita: ofrece primero una fecha o hora alternativa.

FORMATO DE ESCALADO — OBLIGATORIO, sin excepciones:
Cuando debas escalar, escribe SIEMPRE en este orden exacto, dos frases:
LÍNEA 1 — Empatía (elige la que encaje, usa las palabras exactas):
  • Embarazo / consulta médica:      "Entiendo que es importante consultarlo antes, haces muy bien."
  • Queja / lenguaje agresivo:       "Entiendo tu frustración y lo siento mucho."
  • Enfermedad / condición médica:   "Entiendo, gracias por compartirlo — es importante tenerlo en cuenta."
  • Genérico:                        "Entiendo perfectamente."
LÍNEA 2 — Siempre esta frase exacta: "Voy a pedirle a una persona de nuestro equipo que te ayude ahora mismo 😊 En breve te escribe."
CRÍTICO: Nunca escribas solo LÍNEA 2 sin LÍNEA 1. Una respuesta de escalado sin empatía es una respuesta incorrecta.

${!isOpen ? `\n⚠️ FUERA DE HORARIO DE ATENCIÓN
Estás respondiendo fuera del horario de la clínica. Sé breve y cálida.
- Toma nota del interés del cliente.
- Dile que la clínica le contactará cuando abra.
- NO agendes citas.
- Puedes usar este mensaje como referencia: "${config.out_of_hours_message}"
- Si el cliente insiste o dice que es urgente, responde con: "Entiendo que es importante 😊 Te aseguro que serás de los primeros en ser atendidos cuando abramos. ¿Quieres que tome nota de tu consulta para que el equipo te contacte en cuanto pueda?" — nunca prometas horarios concretos ni escales a humano fuera de horario.` : ''}
${config.custom_instructions ? `\n════════════════════════════════\nINSTRUCCIONES ESPECÍFICAS DE LA CLÍNICA\n════════════════════════════════\n${config.custom_instructions}` : ''}

════════════════════════════════
FORMATO OBLIGATORIO DE RESPUESTA
════════════════════════════════
• Responde en texto plano estilo WhatsApp.
• Máximo 3-4 líneas por mensaje. Si necesitas más, usa ${PAUSE_DELIMITER} para separar mensajes.
• Termina siempre con una pregunta o CTA clara.
• Si el cliente menciona un día sin fecha numérica ("el martes", "esta semana", "mañana"): pregunta SIEMPRE la fecha exacta. NUNCA confirmes ni agendes sin fecha numérica explícita.
• Al agendar o confirmar una cita, menciona siempre el tratamiento concreto acordado.
• Después de tu respuesta, llama SIEMPRE a la herramienta analyze_conversation.`
}

// ---------------------------------------------------------------------------
// Analysis tool — Módulo 2 (estados) + Módulo 4 (objeciones) + Módulo 6 (escalado)
// ---------------------------------------------------------------------------

const ANALYSIS_TOOL = {
  name: 'analyze_conversation',
  description: 'Registra el análisis del estado del lead tras tu respuesta. Llama SIEMPRE a esta herramienta.',
  input_schema: {
    type: 'object',
    properties: {
      should_escalate: {
        type: 'boolean',
        description: 'true si la conversación debe pasar a un humano ahora mismo',
      },
      escalation_reason: {
        type: 'string',
        description: 'Razón concreta si should_escalate=true',
      },
      detected_treatment: {
        type: 'string',
        description: 'Tratamiento concreto que el cliente está mencionando o en el que muestra interés',
      },
      intent: {
        type: 'string',
        enum: ['info', 'pricing', 'booking', 'complaint', 'other'],
      },
      qualification: {
        type: 'string',
        enum: ['frio', 'tibio', 'caliente'],
      },
      score_delta: {
        type: 'number',
        description: 'Cambio en el score del lead: entre -10 y +20',
      },
      next_stage: {
        type: 'string',
        enum: ['welcome', 'discovery', 'presentation', 'pricing', 'confirmed', 'closed', 'escalated'],
        description: 'Etapa del flujo de ventas a la que avanza la conversación',
      },
      detected_objection: {
        type: 'string',
        enum: ['price', 'thinking', 'competitor', 'fear', 'time', 'doubt'],
        description: 'Tipo de objeción detectada en el mensaje del cliente, si aplica',
      },
      client_name: {
        type: 'string',
        description: 'Nombre del cliente si lo ha mencionado en este turno de conversación',
      },
      proposed_appointment: {
        type: 'object',
        properties: {
          treatment_name: { type: 'string' },
          preferred_date_iso: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['treatment_name', 'preferred_date_iso'],
      },
    },
    required: ['should_escalate', 'intent', 'qualification', 'score_delta', 'next_stage'],
  },
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function generateAgentResponse(
  leadId: string,
  clinicId: string,
  incomingMessage: string
): Promise<AgentResult> {
  const [clinicQ, configQ, treatmentsQ, historyQ, leadQ] = await Promise.all([
    supabase.from('clinics').select('name').eq('id', clinicId).single(),
    supabase.from('agent_config').select('*').eq('clinic_id', clinicId).single(),
    supabase.from('treatments').select('*').eq('clinic_id', clinicId).eq('active', true),
    supabase.from('messages').select('*').eq('lead_id', leadId).order('created_at').limit(20),
    supabase.from('leads').select('*').eq('id', leadId).single(),
  ])

  if (!clinicQ.data || !configQ.data) {
    return { responses: [], analysis: failsafe('config_missing'), was_sent: false, reason_not_sent: 'config_missing' }
  }

  const clinic = clinicQ.data
  const config = configQ.data as AgentConfig
  const treatments = (treatmentsQ.data || []) as Treatment[]
  const history = (historyQ.data || []) as Message[]
  const lead = leadQ.data

  const currentStage = (lead?.conversation_stage as ConversationStage) ?? 'welcome'
  const clientName = lead?.name ?? null
  const objectionCount = lead?.objection_count ?? 0

  if (lead?.escalated) {
    return { responses: [], analysis: failsafe('already_escalated'), was_sent: false, reason_not_sent: 'already_escalated' }
  }

  // Count only agent messages since the last time a human explicitly returned control
  // to the AI (escalation_reset_at). This prevents immediate re-escalation after
  // "Devolver a IA" is clicked on a lead that already hit max_auto_messages.
  const outboundCountQ = supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('sender', 'agent')
  if (lead?.escalation_reset_at) {
    outboundCountQ.gt('created_at', lead.escalation_reset_at)
  }
  const { count: outboundCount } = await outboundCountQ

  if ((outboundCount ?? 0) >= (config.max_auto_messages ?? 10)) {
    await supabase.from('leads').update({ escalated: true }).eq('id', leadId)
    return { responses: [], analysis: failsafe('max_messages_reached'), was_sent: false, reason_not_sent: 'max_messages_reached' }
  }

  if (isSocialClosing(incomingMessage) && currentStage !== 'confirmed') {
    const name = clientName ? `, ${clientName}` : ''
    return {
      responses: [`¡Hasta pronto${name}! Cuando quieras aquí estaremos 😊`],
      analysis: {
        should_escalate: false,
        intent: 'other',
        qualification: (lead?.qualification as 'frio' | 'tibio' | 'caliente') ?? 'frio',
        score_delta: 0,
        next_stage: currentStage,
        detected_objection: null,
        client_name: null,
      },
      was_sent: true,
    }
  }

  const isOpen = isWithinBusinessHours(config)
  const systemPrompt = buildSystemPrompt(clinic.name, config, treatments, isOpen, currentStage, clientName)
  const conversation = formatHistory(history)
  const last = conversation[conversation.length - 1]
  if (!last || last.content !== incomingMessage) {
    conversation.push({ role: 'user', content: incomingMessage })
  }

  let rawResponse = ''
  let analysis: AgentAnalysis = failsafe('no_tool_call')

  try {
    const textCompletion = await getOpenAI().chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversation,
      ],
    })
    rawResponse = textCompletion.choices[0].message.content?.trim() ?? ''

    if (!rawResponse) {
      return {
        responses: [config.fallback_message],
        analysis: { ...analysis, should_escalate: true, escalation_reason: 'empty_response', next_stage: 'escalated' },
        was_sent: true,
      }
    }

    if (currentStage === 'confirmed' && isExplicitConfirmation(incomingMessage)) {
      analysis = {
        should_escalate: false,
        intent: 'booking',
        qualification: 'caliente',
        score_delta: 10,
        next_stage: 'closed',
        detected_objection: null,
        client_name: null,
      }
    } else {
      const analysisCompletion = await getOpenAI().chat.completions.create({
        model: MODEL,
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversation,
          { role: 'assistant', content: rawResponse },
        ],
        tools: [{
          type: 'function',
          function: {
            name: ANALYSIS_TOOL.name,
            description: ANALYSIS_TOOL.description,
            parameters: ANALYSIS_TOOL.input_schema,
          },
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_conversation' } },
      })

      const toolCall = analysisCompletion.choices[0].message.tool_calls?.[0]
      if (toolCall && toolCall.type === 'function') {
        const input = JSON.parse(toolCall.function.arguments) as Partial<AgentAnalysis>
        analysis = {
          should_escalate: input.should_escalate ?? false,
          escalation_reason: input.escalation_reason,
          detected_treatment: input.detected_treatment,
          intent: input.intent ?? 'other',
          qualification: input.qualification ?? 'frio',
          score_delta: typeof input.score_delta === 'number' ? input.score_delta : 0,
          next_stage: input.next_stage ?? currentStage,
          detected_objection: input.detected_objection ?? null,
          client_name: input.client_name ?? null,
          proposed_appointment: input.proposed_appointment,
        }
      }
    }
  } catch (err) {
    console.error('[agent] OpenAI error:', err)
    return {
      responses: [config.fallback_message],
      analysis: failsafe('openai_error'),
      was_sent: true,
      reason_not_sent: 'openai_error',
    }
  }

  // Split response into multiple messages on [PAUSA] delimiter
  const responses = rawResponse
    .split(PAUSE_DELIMITER)
    .map(m => m.trim())
    .filter(m => m.length > 0)

  // Auto-escalate if objection repeated 3+ times
  const newObjectionCount = analysis.detected_objection ? objectionCount + 1 : objectionCount
  const forceEscalate = newObjectionCount >= 3

  const finalStage: ConversationStage = (analysis.should_escalate || forceEscalate)
    ? 'escalated'
    : analysis.next_stage

  // Update lead
  const newScore = Math.max(0, Math.min(100, (lead?.score ?? 0) + analysis.score_delta))

  const leadUpdate: Record<string, unknown> = {
    score: newScore,
    qualification: analysis.qualification,
    treatment_interest: analysis.detected_treatment ?? lead?.treatment_interest,
    escalated: (analysis.should_escalate || forceEscalate) ? true : lead?.escalated,
    last_message_at: new Date().toISOString(),
    conversation_stage: finalStage,
    objection_count: newObjectionCount,
  }

  if (analysis.client_name && !lead?.name) {
    leadUpdate.name = analysis.client_name
  }

  await supabase.from('leads').update(leadUpdate).eq('id', leadId)

  // --- Persistencia de cita --------------------------------------------------
  // El orden importa. Si la conversación se está CONFIRMANDO, confirmamos la cita
  // pendiente y NO creamos una nueva (evita duplicados). Solo si no estamos
  // confirmando creamos/actualizamos la propuesta — y únicamente dentro de horario
  // y con hora concreta.
  const isConfirming =
    finalStage === 'closed' ||
    (currentStage === 'confirmed' && isExplicitConfirmation(incomingMessage))

  const matchTreatment = (name?: string) => {
    const n = name?.toLowerCase()
    return treatments.find(t => n && t.name.toLowerCase() === n)
  }

  const findPendingAppt = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('id')
      .eq('lead_id', leadId)
      .eq('status', 'agendada')
      .eq('requires_human_confirmation', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data
  }

  if (isConfirming) {
    const pendingAppt = await findPendingAppt()
    if (pendingAppt) {
      // Auto-confirmación: el cliente ha dicho que sí.
      await supabase
        .from('appointments')
        .update({
          status: 'confirmada',
          requires_human_confirmation: false,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', pendingAppt.id)
    } else if (isOpen && analysis.proposed_appointment?.preferred_date_iso) {
      // Propuesta y confirmación en el mismo turno: crear ya confirmada.
      const apptISO = normalizeProposedDate(analysis.proposed_appointment.preferred_date_iso)
      if (apptISO && new Date(apptISO) > new Date()) {
        await supabase.from('appointments').insert({
          lead_id: leadId,
          clinic_id: clinicId,
          treatment_id: matchTreatment(analysis.proposed_appointment.treatment_name)?.id ?? null,
          appointment_date: apptISO,
          status: 'confirmada',
          notes: `Agendada por agente IA. ${analysis.proposed_appointment.notes ?? ''}`.trim(),
          proposed_by: 'agent',
          requires_human_confirmation: false,
          confirmed_at: new Date().toISOString(),
        })
      }
    }
  } else if (isOpen && analysis.proposed_appointment?.preferred_date_iso) {
    const apptISO = normalizeProposedDate(analysis.proposed_appointment.preferred_date_iso)
    if (apptISO && new Date(apptISO) > new Date()) {
      const notes = `Propuesta por agente IA. ${analysis.proposed_appointment.notes ?? ''}`.trim()
      const treatmentId = matchTreatment(analysis.proposed_appointment.treatment_name)?.id ?? null

      // Dedupe: un lead tiene como mucho UNA cita pendiente. Si ya existe, la
      // actualizamos en vez de crear otra.
      const existingPending = await findPendingAppt()
      if (existingPending) {
        await supabase
          .from('appointments')
          .update({ treatment_id: treatmentId, appointment_date: apptISO, notes })
          .eq('id', existingPending.id)
      } else {
        await supabase.from('appointments').insert({
          lead_id: leadId,
          clinic_id: clinicId,
          treatment_id: treatmentId,
          appointment_date: apptISO,
          status: 'agendada',
          notes,
          proposed_by: 'agent',
          requires_human_confirmation: true,
        })
      }
    }
  }

  return { responses, analysis, was_sent: true }
}

// ---------------------------------------------------------------------------
// Follow-up proactivo (cron-driven)
// ---------------------------------------------------------------------------

function buildFollowUpPrompt(
  clinicName: string,
  config: AgentConfig,
  treatmentName: string | null,
  clientName: string | null,
  type: 'first' | 'close'
): string {
  const agentName = config.agent_name ?? 'Sara'
  const treatment = treatmentName ?? 'nuestros tratamientos'
  const nameRef = clientName ? ` ${clientName}` : ''

  if (type === 'first') {
    return `Eres ${agentName}, la asesora de estética de ${clinicName}.

Hace más de 24 horas enviaste información sobre ${treatment} y el cliente no ha respondido.
Tu objetivo: reabrir la conversación de forma natural y genuina en un único mensaje corto.

REGLAS:
• NO repitas el precio.
• NO uses urgencia artificial ("última plaza", "oferta limitada").
• Máximo 2 líneas. Termina con UNA pregunta abierta sencilla.
• Texto plano, sin markdown, sin emojis de precio.

Ejemplo correcto: "Hola${nameRef} 😊 Solo quería ver si te había surgido alguna duda sobre lo que te comenté."

Escribe solo el mensaje, sin explicaciones.`
  }

  return `Eres ${agentName}, la asesora de estética de ${clinicName}.

El cliente lleva más de 72 horas sin responder. Debes hacer un cierre amable que deje la puerta abierta, sin insistir más.

REGLAS:
• No menciones tratamiento ni precio.
• Máximo 1-2 líneas, cálidas y sin presión.
• Texto plano, sin markdown.

Ejemplo correcto: "No pasa nada${nameRef}, cuando quieras aquí estaremos 😊"

Escribe solo el mensaje, sin explicaciones.`
}

export async function generateFollowUpMessage(
  leadId: string,
  clinicId: string,
  type: 'first' | 'close'
): Promise<AgentResult> {
  const [clinicQ, configQ, leadQ] = await Promise.all([
    supabase.from('clinics').select('name').eq('id', clinicId).single(),
    supabase.from('agent_config').select('*').eq('clinic_id', clinicId).single(),
    supabase.from('leads').select('name, treatment_interest, escalated').eq('id', leadId).single(),
  ])

  if (!clinicQ.data || !configQ.data) {
    return { responses: [], analysis: failsafe('config_missing'), was_sent: false, reason_not_sent: 'config_missing' }
  }

  const lead = leadQ.data
  if (lead?.escalated) {
    return { responses: [], analysis: failsafe('already_escalated'), was_sent: false, reason_not_sent: 'already_escalated' }
  }

  const config = configQ.data as AgentConfig
  const systemPrompt = buildFollowUpPrompt(
    clinicQ.data.name,
    config,
    lead?.treatment_interest ?? null,
    lead?.name ?? null,
    type
  )

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{ role: 'system', content: systemPrompt }],
    })

    const raw = completion.choices[0].message.content?.trim() ?? ''
    if (!raw) {
      return { responses: [], analysis: failsafe('empty_response'), was_sent: false, reason_not_sent: 'empty_response' }
    }

    const responses = raw.split(PAUSE_DELIMITER).map(m => m.trim()).filter(Boolean)

    await supabase.from('leads').update({
      last_message_at: new Date().toISOString(),
      ...(type === 'close' ? { status: 'inactivo' } : {}),
    }).eq('id', leadId)

    const analysis: AgentAnalysis = {
      should_escalate: false,
      intent: 'other',
      qualification: type === 'close' ? 'frio' : 'tibio',
      score_delta: type === 'close' ? -5 : 0,
      next_stage: type === 'close' ? 'escalated' : 'pricing',
      detected_objection: null,
      client_name: null,
    }

    return { responses, analysis, was_sent: true }
  } catch (err) {
    console.error('[agent] generateFollowUpMessage error:', err)
    return { responses: [], analysis: failsafe('openai_error'), was_sent: false, reason_not_sent: 'openai_error' }
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function failsafe(reason: string): AgentAnalysis {
  return {
    should_escalate: true,
    escalation_reason: reason,
    intent: 'other',
    qualification: 'frio',
    score_delta: 0,
    next_stage: 'escalated',
    detected_objection: null,
    client_name: null,
  }
}
