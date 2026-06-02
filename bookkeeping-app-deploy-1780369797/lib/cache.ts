// Simple in-memory cache for API responses
interface CacheItem<T> {
  value: T
  expires: number
}

const cache = new Map<string, CacheItem<any>>()

export function getCached<T>(key: string): T | null {
  const item = cache.get(key)
  if (!item) return null

  if (Date.now() > item.expires) {
    cache.delete(key)
    return null
  }

  return item.value as T
}

export function setCached<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
  cache.set(key, {
    value,
    expires: Date.now() + ttlMs
  })
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }

  for (const key of Array.from(cache.keys())) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  }
}
