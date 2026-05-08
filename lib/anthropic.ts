// Cliente de Anthropic — placeholder para la integración con Claude
// TODO: implementar en siguiente fase

export const ANTHROPIC_MODEL = 'claude-sonnet-4-6'

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentPromptContext {
  clinicName: string
  treatments: Array<{ name: string; price: number; description?: string }>
  tone: 'formal' | 'cercano' | 'profesional'
  rules: string[]
  welcomeMessage: string
  conversationHistory: AnthropicMessage[]
  incomingMessage: string
}

export function buildSystemPrompt(ctx: AgentPromptContext): string {
  const treatmentList = ctx.treatments
    .map(t => `- ${t.name}: ${t.price}€${t.description ? ` (${t.description})` : ''}`)
    .join('\n')

  return `Eres el asistente virtual de ${ctx.clinicName}, una clínica estética.
Tono: ${ctx.tone}. Responde siempre en el idioma del cliente.

TRATAMIENTOS DISPONIBLES:
${treatmentList || 'No hay tratamientos configurados.'}

REGLAS:
${ctx.rules.map(r => `- ${r}`).join('\n')}
- Nunca inventes precios ni información médica.
- Si te preguntan por algo fuera de los tratamientos listados, escala al equipo.`
}

// TODO: descomenta cuando instales @anthropic-ai/sdk
// import Anthropic from '@anthropic-ai/sdk'
// export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateAgentResponse(
  _ctx: AgentPromptContext
): Promise<string> {
  throw new Error('Anthropic integration not yet implemented — coming next phase')
}
