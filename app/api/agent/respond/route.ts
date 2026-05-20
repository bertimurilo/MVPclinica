import { NextRequest, NextResponse } from 'next/server'

// DEAD CODE — no hay ninguna llamada a este endpoint en el frontend.
// El agente responde automáticamente desde /api/webhook/zapi al recibir mensajes.
// Si se necesita respuesta manual del agente desde el inbox, implementar aquí.

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented' },
    { status: 501 }
  )
}
