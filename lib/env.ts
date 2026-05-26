/**
 * Lazy env accessor — throws at access time (request handling), not at module load.
 * This prevents Next.js build from failing when collecting page data for routes
 * that don't use every env var.
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

export const env = new Proxy({} as Record<EnvKey, string>, {
  get(_, key: string) {
    const value = process.env[key]
    if (!value) throw new Error(`Missing required env var: ${key}`)
    return value
  },
})
