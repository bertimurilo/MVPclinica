const BASE_URL = 'https://api.z-api.io'

function buildHeaders(clientToken?: string | null): Record<string, string> {
  const token = clientToken ?? process.env.Z_API_CLIENT_TOKEN
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Client-Token': token } : {}),
  }
}

export async function sendMessage(
  phone: string,
  message: string,
  instanceId: string,
  token: string,
  clientToken?: string | null
): Promise<boolean> {
  const url = `${BASE_URL}/instances/${instanceId}/token/${token}/send-text`
  const body = JSON.stringify({ phone, message })
  const headers = buildHeaders(clientToken)
  const MAX_ATTEMPTS = 3
  const TIMEOUT_MS = 8000

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal })
      clearTimeout(timer)
      if (res.ok) return true
      const errorBody = await res.text()
      console.error(`[zapi] sendMessage attempt ${attempt} failed:`, res.status, errorBody)
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 1000 * attempt))
    } catch (err) {
      clearTimeout(timer)
      console.error(`[zapi] sendMessage attempt ${attempt} error:`, err)
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 1000 * attempt))
      if (attempt === MAX_ATTEMPTS) throw new Error(`[zapi] sendMessage failed after ${MAX_ATTEMPTS} attempts: ${err}`)
    }
  }
  return false
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
