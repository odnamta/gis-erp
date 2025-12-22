// =====================================================
// v0.41: EQUIPMENT - ASSET REGISTRY UTILITIES
// =====================================================

import type {
  Asset,
  AssetStatus,
  AssetSummaryStats,
  ExpiringDocument,
  DocumentExpiryStatus,
} from '@/types/assets'

/**
 * Format currency for display (Indonesian Rupiah)
 */
export function formatAssetCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Calculate asset age in years and months
 */
export function calculateAssetAge(purchaseDate: string | null): string {
  if (!purchaseDate) return '-'
  
  const purchase = new Date(purchaseDate)
  const now = new Date()
  
  const years = now.getFullYear() - purchase.getFullYear()
  const months = now.getMonth() - purchase.getMonth()
  
  let totalMonths = years * 12 + months
  if (now.getDate() < purchase.getDate()) {
    totalMonths--
  }
  
  const displayYears = Math.floor(totalMonths / 12)
  const displayMonths = totalMonths % 12
  
  if (displayYears === 0) {
    return `${displayMonths} month${displayMonths !== 1 ? 's' : ''}`
  }
  
  return `${displayYears} year${displayYears !== 1 ? 's' : ''} ${displayMonths} month${displayMonths !== 1 ? 's' : ''}`
}

/**
 * Calculate straight-line depreciation
 */
export function calculateStraightLineDepreciation(
  purchasePrice: number,
  salvageValue: number,
  usefulLifeYears: number,
  purchaseDate: string
): { accumulatedDepreciation: number; bookValue: number; monthlyDepreciation: number } {
  if (usefulLifeYears <= 0) {
    return { accumulatedDepreciation: 0, bookValue: purchasePrice, monthlyDepreciation: 0 }
  }

  const depreciableAmount = purchasePrice - salvageValue
  const monthlyDepreciation = depreciableAmount / (usefulLifeYears * 12)
  
  const purchase = new Date(purchaseDate)
  const now = new Date()
  const monthsElapsed = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth())
  
  const maxMonths = usefulLifeYears * 12
  const effectiveMonths = Math.min(Math.max(0, monthsElapsed), maxMonths)
  
  const accumulatedDepreciation = effectiveMonths * monthlyDepreciation
  const bookValue = Math.max(salvageValue, purchasePrice - accumulatedDepreciation)
  
  return { accumulatedDepreciation, bookValue, monthlyDepreciation }
}

/**
 * Get status badge color
 */
export function getAssetStatusColor(status: AssetStatus): string {
  const colors: Record<AssetStatus, string> = {
    active: 'bg-green-100 text-green-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    repair: 'bg-orange-100 text-orange-800',
    idle: 'bg-gray-100 text-gray-800',
    disposed: 'bg-red-100 text-red-800',
    sold: 'bg-blue-100 text-blue-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get document expiry status color
 */
export function getExpiryStatusColor(status: DocumentExpiryStatus): string {
  const colors: Record<DocumentExpiryStatus, string> = {
    valid: 'bg-green-100 text-green-800',
    expiring_soon: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
    no_expiry: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
