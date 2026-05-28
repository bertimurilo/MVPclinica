#!/usr/bin/env node
/**
 * scripts/auth-google-calendar.ts
 *
 * Obtiene el refresh_token de Google Calendar mediante OAuth2.
 * Ejecútalo una sola vez para configurar la integración.
 *
 * Pasos previos:
 *   1. Ve a https://console.cloud.google.com/
 *   2. Crea o selecciona un proyecto
 *   3. Habilita "Google Calendar API" en "APIs y servicios"
 *   4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente OAuth 2.0"
 *   5. Tipo de aplicación: "Aplicación de escritorio"
 *   6. Descarga el JSON y copia client_id y client_secret a .env.local:
 *        GOOGLE_CLIENT_ID=...
 *        GOOGLE_CLIENT_SECRET=...
 *   7. Ejecuta: npx tsx scripts/auth-google-calendar.ts
 *   8. Copia el GOOGLE_REFRESH_TOKEN que aparezca en consola a .env.local
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { google } from 'googleapis'
import { createServer } from 'http'
import { URL } from 'url'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local')
  console.error('    Sigue los pasos descritos en este archivo.\n')
  process.exit(1)
}

const PORT = 3001
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`
const SCOPES = ['https://www.googleapis.com/auth/calendar']

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // fuerza que Google devuelva refresh_token
})

console.log('\n🔑  Autorización de Google Calendar')
console.log('═'.repeat(60))
console.log('\n1. Abre esta URL en tu navegador:\n')
console.log(`   ${authUrl}\n`)
console.log('2. Inicia sesión con mbertibusiness@gmail.com')
console.log('3. Aprueba los permisos solicitados')
console.log('4. Serás redirigido automáticamente...\n')
console.log(`⏳  Esperando en http://localhost:${PORT}/oauth2callback\n`)

// Servidor temporal para capturar el callback de OAuth2
const server = createServer(async (req, res) => {
  if (!req.url?.startsWith('/oauth2callback')) return

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    res.end(`<h2>❌ Error: ${error}</h2><p>Cierra esta ventana.</p>`)
    server.close()
    console.error('\n❌  Autorización rechazada:', error)
    process.exit(1)
  }

  if (!code) {
    res.end('<h2>❌ No se recibió código</h2><p>Cierra esta ventana e inténtalo de nuevo.</p>')
    server.close()
    process.exit(1)
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)

    res.end(`
      <html><body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px">
        <h2>✅ Autorización completada</h2>
        <p>Cierra esta ventana y vuelve a la terminal.</p>
      </body></html>
    `)
    server.close()

    console.log('✅  Autorización completada.\n')
    console.log('─'.repeat(60))
    console.log('Añade estas líneas a .env.local:\n')
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`)
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`)
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log(`GOOGLE_CALENDAR_ID=mbertibusiness@gmail.com`)
    console.log('\n─'.repeat(60))
    console.log('\n🚀  Ahora puedes ejecutar: npm run seed:appointments\n')
  } catch (err) {
    res.end('<h2>❌ Error al obtener token</h2><p>Cierra esta ventana e inténtalo de nuevo.</p>')
    server.close()
    console.error('\n❌  Error al obtener tokens:', (err as Error).message)
    process.exit(1)
  }
})

server.listen(PORT, () => {
  // Intentar abrir el navegador automáticamente (solo macOS/Linux/Windows)
  const { exec } = require('child_process') as typeof import('child_process')
  const platform = process.platform
  const cmd =
    platform === 'win32' ? `start "" "${authUrl}"` :
    platform === 'darwin' ? `open "${authUrl}"` :
    `xdg-open "${authUrl}"`

  exec(cmd, (err) => {
    if (err) {
      console.log('No se pudo abrir el navegador automáticamente.')
      console.log('Copia la URL de arriba y pégala manualmente.\n')
    }
  })
})
