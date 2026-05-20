import { LRUCache } from 'lru-cache'

type RateLimitOptions = {
  interval: number  // ventana en ms
  limit: number     // max requests por ventana
}

const caches = new Map<string, LRUCache<string, number[]>>()

function getCache(key: string, options: RateLimitOptions) {
  if (!caches.has(key)) {
    caches.set(key, new LRUCache<string, number[]>({
      max: 500,
      ttl: options.interval,
    }))
  }
  return caches.get(key)!
}

export function rateLimit(
  identifier: string,
  namespace: string,
  options: RateLimitOptions
): { success: boolean; remaining: number } {
  const cache = getCache(namespace, options)
  const now = Date.now()
  const timestamps = (cache.get(identifier) ?? []).filter(
    t => now - t < options.interval
  )
  if (timestamps.length >= options.limit) {
    return { success: false, remaining: 0 }
  }
  timestamps.push(now)
  cache.set(identifier, timestamps)
  return { success: true, remaining: options.limit - timestamps.length }
}
