import { NextRequest, NextResponse } from 'next/server'

// TODO: implementar en siguiente fase
// Este endpoint recibirá el lead_id + mensaje y llamará al Edge Function
// o directamente a la API de Anthropic para generar la respuesta del agente

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented — coming in next phase' },
    { status: 501 }
  )
}
