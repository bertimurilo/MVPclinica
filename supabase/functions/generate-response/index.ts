import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'claude-sonnet-4-6'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lead_id, clinic_id, incoming_message } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const [clinicRes, configRes, treatmentsRes, messagesRes] = await Promise.all([
      supabase.from('clinics').select('name').eq('id', clinic_id).single(),
      supabase.from('agent_config').select('*').eq('clinic_id', clinic_id).single(),
      supabase.from('treatments').select('*').eq('clinic_id', clinic_id).eq('active', true),
      supabase.from('messages').select('*').eq('lead_id', lead_id).order('created_at').limit(20),
    ])

    const clinic = clinicRes.data
    const config = configRes.data
    const treatments = treatmentsRes.data ?? []
    const history = messagesRes.data ?? []

    if (!clinic || !config) {
      return new Response(JSON.stringify({ error: 'config_missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const treatmentList = treatments
      .map((t: { name: string; price?: number; duration_minutes?: number }) => {
        const price = t.price ? `${t.price}€` : 'precio bajo consulta'
        const dur = t.duration_minutes ? `, ${t.duration_minutes} min` : ''
        return `- ${t.name} (${price}${dur})`
      })
      .join('\n')

    const conversation = history
      .sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .slice(-10)
      .map((m: { direction: string; content: string; message_type: string }) => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content || `[mensaje no-texto: ${m.message_type}]`,
      }))

    const last = conversation[conversation.length - 1]
    if (!last || last.content !== incoming_message) {
      conversation.push({ role: 'user', content: incoming_message })
    }

    const systemPrompt = `Eres el asistente virtual de ${clinic.name}, una clínica estética.
Tono: ${config.tone}. Responde siempre en el mismo idioma que el cliente.

TRATAMIENTOS DISPONIBLES:
${treatmentList || 'No hay tratamientos configurados.'}

REGLAS: Solo habla de los tratamientos listados. No inventes precios. No des consejos médicos.
Responde en texto plano estilo WhatsApp (máximo 2-3 frases).`

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: systemPrompt,
        messages: conversation,
        tools: [{
          name: 'analyze_conversation',
          description: 'Analiza el estado del lead. Llama siempre.',
          input_schema: {
            type: 'object',
            properties: {
              should_escalate: { type: 'boolean' },
              intent: { type: 'string', enum: ['info', 'pricing', 'booking', 'complaint', 'other'] },
              qualification: { type: 'string', enum: ['frio', 'tibio', 'caliente'] },
              score_delta: { type: 'number' },
            },
            required: ['should_escalate', 'intent', 'qualification', 'score_delta'],
          },
        }],
        tool_choice: { type: 'auto' },
      }),
    })

    const data = await anthropicRes.json()

    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text')
    const toolBlock = data.content?.find((b: { type: string }) => b.type === 'tool_use')
    const analysis = toolBlock?.input ?? {}

    return new Response(JSON.stringify({
      response: textBlock?.text ?? config.fallback_message,
      should_escalate: analysis.should_escalate ?? false,
      detected_intent: analysis.intent ?? 'other',
      qualification: analysis.qualification ?? 'frio',
      score_delta: analysis.score_delta ?? 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
