// In-memory cache for API responses
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry>()

export function getCached(key: string): any {
  const entry = cache.get(key)
  if (!entry) {
    return null
  }

  const now = Date.now()
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key)
    return null
  }

  return entry.data
}

export function setCached(key: string, data: any, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  })
}

export function invalidateCache(key: string): void {
  cache.delete(key)
}

export function clearAllCache(): void {
  cache.clear()
}
