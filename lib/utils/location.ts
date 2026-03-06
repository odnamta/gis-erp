/**
 * Extract the key part of a location string for fuzzy matching.
 * "Surabaya, Jawa Timur, Indonesia" -> "Surabaya"
 * "PT XYZ, Jl. Raya No. 1, Surabaya" -> "PT XYZ"
 */
export function extractLocationKey(location: string): string {
  if (!location) return ''

  // Take the first part before comma, trim whitespace
  const parts = location.split(',')
  const key = parts[0].trim()

  // If the key is too short (< 3 chars), use the full string
  if (key.length < 3) return location.trim()

  return key
}
