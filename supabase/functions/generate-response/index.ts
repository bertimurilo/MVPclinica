// Supabase Edge Function: generate-response
// Called by the webhook handler to generate AI responses for incoming WhatsApp messages

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Fetch clinic config
    const { data: agentConfig } = await supabase
      .from('agent_config')
      .select('*')
      .eq('clinic_id', clinic_id)
      .single()

    // Fetch treatments
    const { data: treatments } = await supabase
      .from('treatments')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('active', true)

    // Fetch conversation history (last 10 messages)
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', lead_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: clinic } = await supabase
      .from('clinics')
      .select('name')
      .eq('id', clinic_id)
      .single()

    // TODO: Build prompt and call Anthropic API
    // const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    const response = {
      response: agentConfig?.welcome_message ?? 'Hola, ¿en qué puedo ayudarte?',
      should_escalate: false,
      detected_intent: 'info',
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
