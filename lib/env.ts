/**
 * Validates required server-side env vars at module load time.
 * Import this file in any server-side module that consumes env vars —
 * it fails fast with a descriptive error instead of silently passing undefined.
 *
 * Do NOT import from client-side code (use process.env.NEXT_PUBLIC_* directly there).
 */

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
  'Z_API_WEBHOOK_SECRET',
] as const

type EnvKey = (typeof REQUIRED)[number]

const missing = REQUIRED.filter(key => !process.env[key])
if (missing.length > 0) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`)
}

export const env: Record<EnvKey, string> = Object.fromEntries(
  REQUIRED.map(key => [key, process.env[key] as string])
) as Record<EnvKey, string>
