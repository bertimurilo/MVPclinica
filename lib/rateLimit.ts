import { createServiceClient } from '@/lib/supabase/server'

type RateLimitOptions = {
  interval: number  // ventana en ms
  limit: number     // max requests por ventana
}

export async function rateLimit(
  identifier: string,
  namespace: string,
  options: RateLimitOptions
): Promise<{ success: boolean; remaining: number }> {
  const supabase = createServiceClient()
  const windowStart = new Date(
    Math.floor(Date.now() / options.interval) * options.interval
  ).toISOString()

  const { data, error } = await supabase.rpc('rate_limit_increment', {
    p_identifier: identifier,
    p_namespace: namespace,
    p_window_start: windowStart,
  })

  if (error) {
    // Fail open: si Supabase falla no bloqueamos el request
    console.error('[rateLimit] Supabase error:', error.message)
    return { success: true, remaining: options.limit }
  }

  const count = data as number

  // Limpieza TTL en background — sin await para no bloquear
  supabase
    .from('rate_limit_windows')
    .delete()
    .lt('window_start', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .then(() => {})

  if (count >= options.limit) {
    return { success: false, remaining: 0 }
  }
  return { success: true, remaining: options.limit - count }
}
