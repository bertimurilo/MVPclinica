const BASE_URL = 'https://api.z-api.io'

function getHeaders(): Record<string, string> {
  const clientToken = process.env.Z_API_CLIENT_TOKEN
  return {
    'Content-Type': 'application/json',
    ...(clientToken ? { 'Client-Token': clientToken } : {}),
  }
}

export async function sendMessage(
  phone: string,
  message: string,
  instanceId: string,
  token: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE_URL}/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone, message }),
      }
    )
    if (!res.ok) {
      const errorBody = await res.text()
      console.error('[zapi] sendMessage failed:', res.status, errorBody)
      return false
    }
    return true
  } catch (err) {
    console.error('[zapi] sendMessage error:', err)
    return false
  }
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
