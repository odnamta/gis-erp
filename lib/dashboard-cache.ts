'use server'

/**
 * Dashboard Cache Utility
 * Implements in-memory caching with TTL for dashboard data
 * Optimizes owner dashboard loading to < 500ms for cached data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// In-memory cache store (per-instance, resets on server restart)
const cache = new Map<string, CacheEntry<unknown>>()

// Default TTL: 5 minutes (300,000ms)
const DEFAULT_TTL = 5 * 60 * 1000

/**
 * Generate cache key based on user role and date
 */
export async function generateCacheKey(
  prefix: string,
  role: string,
  date?: Date
): Promise<string> {
  const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  return `${prefix}:${role}:${dateStr}`
}

/**
 * Get cached data if fresh, otherwise return null
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  
  if (!entry) {
    return null
  }
  
  const now = Date.now()
  const isExpired = now - entry.timestamp > entry.ttl
  
  if (isExpired) {
    cache.delete(key)
    return null
  }
  
  return entry.data
}

/**
 * Set cache entry with TTL
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  })
}

/**
 * Invalidate cache entry
 */
export async function invalidateCache(key: string): Promise<void> {
  cache.delete(key)
}

/**
 * Invalidate all cache entries matching a prefix
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

/**
 * Get or fetch pattern - returns cached data if fresh, otherwise fetches and caches
 */
export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cached = await getCached<T>(key)
  
  if (cached !== null) {
    return cached
  }
  
  const data = await fetcher()
  await setCache(key, data, ttl)
  
  return data
}
