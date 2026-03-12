/**
 * Recent Searches Utility Functions
 * v0.24: Global Search Feature
 * 
 * Manages recent search queries in browser localStorage
 */

const STORAGE_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 5;

/**
 * Load recent searches from localStorage
 * @returns Array of recent search queries
 */
export function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_RECENT_SEARCHES);
      }
    }
  } catch (_error) {
  }

  return [];
}

/**
 * Save a search query to recent searches
 * - Moves existing query to top if it already exists (no duplicates)
 * - Limits to MAX_RECENT_SEARCHES items
 * @param query - Search query to save
 * @returns Updated array of recent searches
 */
export function saveRecentSearch(query: string): string[] {
  if (typeof window === 'undefined' || !query.trim()) {
    return loadRecentSearches();
  }

  const trimmedQuery = query.trim();
  const current = loadRecentSearches();
  
  // Remove existing occurrence (if any) and add to front
  const filtered = current.filter(s => s !== trimmedQuery);
  const updated = [trimmedQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_error) {
  }

  return updated;
}

/**
 * Clear all recent searches
 */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
  }
}

/**
 * Remove a specific search from recent searches
 * @param query - Search query to remove
 * @returns Updated array of recent searches
 */
export function removeRecentSearch(query: string): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const current = loadRecentSearches();
  const updated = current.filter(s => s !== query);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (_error) {
  }

  return updated;
}

/**
 * Add a search to recent searches (pure function for testing)
 * Does not interact with localStorage
 * @param recentSearches - Current array of recent searches
 * @param query - New search query to add
 * @returns Updated array of recent searches
 */
export function addToRecentSearches(
  recentSearches: string[],
  query: string
): string[] {
  if (!query.trim()) {
    return recentSearches;
  }

  const trimmedQuery = query.trim();
  
  // Remove existing occurrence (if any) and add to front
  const filtered = recentSearches.filter(s => s !== trimmedQuery);
  return [trimmedQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
}

/**
 * Get the maximum number of recent searches allowed
 */
export function getMaxRecentSearches(): number {
  return MAX_RECENT_SEARCHES;
}
