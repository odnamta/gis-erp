/**
 * Page View Tracker Utilities (v0.13.1)
 * 
 * Rate limiting and path exclusion logic for page view tracking.
 * Used by middleware to determine if a page view should be logged.
 */

// Paths to exclude from page view tracking
export const EXCLUDED_PATHS = [
  '/_next',
  '/api',
  '/auth',
  '/login',
  '/favicon.ico',
  '/static',
  '/account-deactivated',
];

// Rate limiter cache (in-memory, per-instance)
// Key: `${userId}:${pagePath}`, Value: timestamp
const pageViewCache = new Map<string, number>();
const RATE_LIMIT_MS = 60000; // 1 minute
const MAX_CACHE_SIZE = 10000; // Prevent memory issues

/**
 * Check if a path should be excluded from page view tracking
 */
export function shouldExcludePath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(excluded => pathname.startsWith(excluded));
}

/**
 * Check if a page view should be logged based on rate limiting.
 * Returns true if the page view should be logged, false if rate limited.
 */
export function shouldLogPageView(userId: string, pagePath: string): boolean {
  const key = `${userId}:${pagePath}`;
  const now = Date.now();
  const lastLog = pageViewCache.get(key);

  // Clear old entries if cache is too large
  if (pageViewCache.size > MAX_CACHE_SIZE) {
    const cutoff = now - RATE_LIMIT_MS;
    for (const [k, v] of pageViewCache.entries()) {
      if (v < cutoff) {
        pageViewCache.delete(k);
      }
    }
  }

  if (!lastLog || now - lastLog > RATE_LIMIT_MS) {
    pageViewCache.set(key, now);
    return true;
  }

  return false;
}

/**
 * Clear the rate limiter cache (for testing)
 */
export function clearPageViewCache(): void {
  pageViewCache.clear();
}

/**
 * Get the current cache size (for testing/monitoring)
 */
export function getPageViewCacheSize(): number {
  return pageViewCache.size;
}
