import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'
import { formatDate } from '@/lib/utils/format'

// =====================================================
// INTERFACES
// =====================================================

export interface DocumentsByStatus {
  draft: number
  submitted: number
  processing: number
  cleared: number
  rejected: number
}

export interface RecentDocument {
  id: string
  documentRef: string
  documentType: 'PIB' | 'PEB'
  status: string
  createdAt: string
  importerExporter: string
}

export interface DueSoonDocument {
  id: string
  documentRef: string
  documentType: 'PIB' | 'PEB'
  etaEtd: string
  daysUntilDue: number
  status: string
}

export interface FrequentHSCode {
  hsCode: string
  description: string
  usageCount: number
}

export interface CustomsDashboardMetrics {
  // Document Overview
  pibPending: number
  pibCompleted: number
  pebPending: number
  pebCompleted: number
  documentsThisMonth: number
  
  // Status Breakdown
  documentsByStatus: DocumentsByStatus
  
  // Duty Tracking
  dutiesPaidThisMonth: number
  unpaidFeesCount: number
  unpaidFeesAmount: number
  
  // Deadlines
  dueSoonCount: number
  overdueCount: number
  dueSoonDocuments: DueSoonDocument[]
  
  // Recent Activity
  recentDocuments: RecentDocument[]
  
  // HS Code Usage
  frequentHSCodes: FrequentHSCode[]
}

// =====================================================
// CONSTANTS
// =====================================================

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// PIB status mappings
const PIB_PENDING_STATUSES = ['draft', 'submitted', 'checking']
const PIB_COMPLETED_STATUSES = ['approved', 'released']
const PIB_TERMINAL_STATUSES = ['released', 'cancelled']

// PEB status mappings
const PEB_PENDING_STATUSES = ['draft', 'submitted']
const PEB_COMPLETED_STATUSES = ['approved', 'loaded', 'departed']
const PEB_TERMINAL_STATUSES = ['departed', 'cancelled']

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get start of current month
 */
function getStartOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Map PIB/PEB statuses to unified status categories
 */
export function mapToUnifiedStatus(status: string, documentType: 'PIB' | 'PEB'): keyof DocumentsByStatus {
  const normalizedStatus = (status || '').toLowerCase()
  
  if (normalizedStatus === 'draft') return 'draft'
  if (normalizedStatus === 'submitted') return 'submitted'
  if (normalizedStatus === 'checking') return 'processing'
  if (normalizedStatus === 'cancelled') return 'rejected'
  
  // Cleared statuses
  if (documentType === 'PIB') {
    if (['approved', 'released'].includes(normalizedStatus)) return 'cleared'
  } else {
    if (['approved', 'loaded', 'departed'].includes(normalizedStatus)) return 'cleared'
  }
  
  return 'draft' // Default fallback
}

// =====================================================
// MAIN DATA FETCHER
// =====================================================

export async function getCustomsDashboardMetrics(
  role: string = 'customs'
): Promise<CustomsDashboardMetrics> {
  const cacheKey = await generateCacheKey('customs-dashboard-metrics', role)
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const startOfMonth = getStartOfMonth().toISOString()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Run all queries in parallel for performance
    const [
      // PIB metrics
      pibPendingResult,
      pibCompletedResult,
      pibThisMonthResult,
      pibAllStatusesResult,
      
      // PEB metrics
      pebPendingResult,
      pebCompletedResult,
      pebThisMonthResult,
      pebAllStatusesResult,
      
      // Duty tracking
      dutiesPaidResult,
      unpaidFeesResult,
      
      // Deadlines - PIB
      pibDueSoonResult,
      pibOverdueResult,
      pibDueSoonListResult,
      
      // Deadlines - PEB
      pebDueSoonResult,
      pebOverdueResult,
      pebDueSoonListResult,
      
      // Recent documents
      recentPibResult,
      recentPebResult,
      
      // HS codes from PIB items
      pibHsCodesResult,
      
      // HS codes from PEB items
      pebHsCodesResult,
    ] = await Promise.all([
      // PIB pending count
      supabase
        .from('pib_documents')
        .select('id', { count: 'exact', head: true })
        .in('status', PIB_PENDING_STATUSES),
      
      // PIB completed count
      supabase
        .from('pib_documents')
        .select('id', { count: 'exact', head: true })
        .in('status', PIB_COMPLETED_STATUSES),
      
      // PIB this month
      supabase
        .from('pib_documents')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),
      
      // PIB all statuses for grouping
      supabase
        .from('pib_documents')
        .select('status'),
      
      // PEB pending count
      supabase
        .from('peb_documents')
        .select('id', { count: 'exact', head: true })
        .in('status', PEB_PENDING_STATUSES),
      
      // PEB completed count
      supabase
        .from('peb_documents')
        .select('id', { count: 'exact', head: true })
        .in('status', PEB_COMPLETED_STATUSES),
      
      // PEB this month
      supabase
        .from('peb_documents')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),
      
      // PEB all statuses for grouping
      supabase
        .from('peb_documents')
        .select('status'),
      
      // Duties paid this month
      supabase
        .from('customs_fees')
        .select('amount')
        .eq('payment_status', 'paid')
        .gte('payment_date', startOfMonth.split('T')[0]),
      
      // Unpaid fees
      supabase
        .from('customs_fees')
        .select('amount')
        .eq('payment_status', 'unpaid'),
      
      // PIB due soon (ETA within 7 days)
      supabase
        .from('pib_documents')
        .select('id', { count: 'exact', head: true })
        .gte('eta_date', today)
        .lte('eta_date', sevenDaysFromNow)
        .not('status', 'in', `(${PIB_TERMINAL_STATUSES.join(',')})`),
      
      // PIB overdue
      supabase
        .from('pib_documents')
        .select('id', { count: 'exact', head: true })
        .lt('eta_date', today)
        .not('status', 'in', `(${PIB_TERMINAL_STATUSES.join(',')})`),
      
      // PIB due soon list (5 soonest)
      supabase
        .from('pib_documents')
        .select('id, internal_ref, pib_number, eta_date, status')
        .gte('eta_date', today)
        .lte('eta_date', sevenDaysFromNow)
        .not('status', 'in', `(${PIB_TERMINAL_STATUSES.join(',')})`)
        .order('eta_date', { ascending: true })
        .limit(5),
      
      // PEB due soon (ETD within 7 days)
      supabase
        .from('peb_documents')
        .select('id', { count: 'exact', head: true })
        .gte('etd_date', today)
        .lte('etd_date', sevenDaysFromNow)
        .not('status', 'in', `(${PEB_TERMINAL_STATUSES.join(',')})`),
      
      // PEB overdue
      supabase
        .from('peb_documents')
        .select('id', { count: 'exact', head: true })
        .lt('etd_date', today)
        .not('status', 'in', `(${PEB_TERMINAL_STATUSES.join(',')})`),
      
      // PEB due soon list (5 soonest)
      supabase
        .from('peb_documents')
        .select('id, internal_ref, peb_number, etd_date, status')
        .gte('etd_date', today)
        .lte('etd_date', sevenDaysFromNow)
        .not('status', 'in', `(${PEB_TERMINAL_STATUSES.join(',')})`)
        .order('etd_date', { ascending: true })
        .limit(5),
      
      // Recent PIB documents
      supabase
        .from('pib_documents')
        .select('id, internal_ref, pib_number, status, created_at, importer_name')
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Recent PEB documents
      supabase
        .from('peb_documents')
        .select('id, internal_ref, peb_number, status, created_at, exporter_name')
        .order('created_at', { ascending: false })
        .limit(10),
      
      // HS codes from PIB items
      supabase
        .from('pib_items')
        .select('hs_code, hs_description'),
      
      // HS codes from PEB items
      supabase
        .from('peb_items')
        .select('hs_code, hs_description'),
    ])
    
    // Calculate documents by status
    const documentsByStatus: DocumentsByStatus = {
      draft: 0,
      submitted: 0,
      processing: 0,
      cleared: 0,
      rejected: 0,
    }
    
    // Process PIB statuses
    if (pibAllStatusesResult.data) {
      for (const doc of pibAllStatusesResult.data) {
        const unifiedStatus = mapToUnifiedStatus(doc.status || '', 'PIB')
        documentsByStatus[unifiedStatus]++
      }
    }
    
    // Process PEB statuses
    if (pebAllStatusesResult.data) {
      for (const doc of pebAllStatusesResult.data) {
        const unifiedStatus = mapToUnifiedStatus(doc.status || '', 'PEB')
        documentsByStatus[unifiedStatus]++
      }
    }
    
    // Calculate duties paid this month
    let dutiesPaidThisMonth = 0
    if (dutiesPaidResult.data) {
      dutiesPaidThisMonth = dutiesPaidResult.data.reduce(
        (sum, fee) => sum + (Number(fee.amount) || 0),
        0
      )
    }
    
    // Calculate unpaid fees
    let unpaidFeesCount = 0
    let unpaidFeesAmount = 0
    if (unpaidFeesResult.data) {
      unpaidFeesCount = unpaidFeesResult.data.length
      unpaidFeesAmount = unpaidFeesResult.data.reduce(
        (sum, fee) => sum + (Number(fee.amount) || 0),
        0
      )
    }
    
    // Combine due soon documents from PIB and PEB
    const dueSoonDocuments: DueSoonDocument[] = []
    
    if (pibDueSoonListResult.data) {
      for (const doc of pibDueSoonListResult.data) {
        const etaDate = doc.eta_date ? new Date(doc.eta_date) : now
        dueSoonDocuments.push({
          id: doc.id,
          documentRef: doc.internal_ref || doc.pib_number || '',
          documentType: 'PIB',
          etaEtd: formatDate(doc.eta_date),
          daysUntilDue: calculateDaysBetween(now, etaDate),
          status: doc.status || '',
        })
      }
    }
    
    if (pebDueSoonListResult.data) {
      for (const doc of pebDueSoonListResult.data) {
        const etdDate = doc.etd_date ? new Date(doc.etd_date) : now
        dueSoonDocuments.push({
          id: doc.id,
          documentRef: doc.internal_ref || doc.peb_number || '',
          documentType: 'PEB',
          etaEtd: formatDate(doc.etd_date),
          daysUntilDue: calculateDaysBetween(now, etdDate),
          status: doc.status || '',
        })
      }
    }
    
    // Sort by days until due and limit to 5
    dueSoonDocuments.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    const topDueSoonDocuments = dueSoonDocuments.slice(0, 5)
    
    // Combine recent documents from PIB and PEB
    const allRecentDocs: Array<{
      id: string
      ref: string
      type: 'PIB' | 'PEB'
      status: string
      createdAt: string
      name: string
    }> = []
    
    if (recentPibResult.data) {
      for (const doc of recentPibResult.data) {
        allRecentDocs.push({
          id: doc.id,
          ref: doc.internal_ref || doc.pib_number || '',
          type: 'PIB',
          status: doc.status || '',
          createdAt: doc.created_at || '',
          name: doc.importer_name || '',
        })
      }
    }
    
    if (recentPebResult.data) {
      for (const doc of recentPebResult.data) {
        allRecentDocs.push({
          id: doc.id,
          ref: doc.internal_ref || doc.peb_number || '',
          type: 'PEB',
          status: doc.status || '',
          createdAt: doc.created_at || '',
          name: doc.exporter_name || '',
        })
      }
    }
    
    // Sort by created_at descending and take top 10
    allRecentDocs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    const recentDocuments: RecentDocument[] = allRecentDocs.slice(0, 10).map(doc => ({
      id: doc.id,
      documentRef: doc.ref,
      documentType: doc.type,
      status: doc.status,
      createdAt: formatDate(doc.createdAt),
      importerExporter: doc.name,
    }))
    
    // Calculate frequent HS codes
    const hsCodeCounts = new Map<string, { description: string; count: number }>()
    
    if (pibHsCodesResult.data) {
      for (const item of pibHsCodesResult.data) {
        if (item.hs_code) {
          const existing = hsCodeCounts.get(item.hs_code)
          if (existing) {
            existing.count++
          } else {
            hsCodeCounts.set(item.hs_code, {
              description: item.hs_description || '',
              count: 1,
            })
          }
        }
      }
    }
    
    if (pebHsCodesResult.data) {
      for (const item of pebHsCodesResult.data) {
        if (item.hs_code) {
          const existing = hsCodeCounts.get(item.hs_code)
          if (existing) {
            existing.count++
          } else {
            hsCodeCounts.set(item.hs_code, {
              description: item.hs_description || '',
              count: 1,
            })
          }
        }
      }
    }
    
    // Convert to array, sort by count, take top 5
    const frequentHSCodes: FrequentHSCode[] = Array.from(hsCodeCounts.entries())
      .map(([hsCode, data]) => ({
        hsCode,
        description: data.description,
        usageCount: data.count,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
    
    return {
      // Document Overview
      pibPending: pibPendingResult.count || 0,
      pibCompleted: pibCompletedResult.count || 0,
      pebPending: pebPendingResult.count || 0,
      pebCompleted: pebCompletedResult.count || 0,
      documentsThisMonth: (pibThisMonthResult.count || 0) + (pebThisMonthResult.count || 0),
      
      // Status Breakdown
      documentsByStatus,
      
      // Duty Tracking
      dutiesPaidThisMonth,
      unpaidFeesCount,
      unpaidFeesAmount,
      
      // Deadlines
      dueSoonCount: (pibDueSoonResult.count || 0) + (pebDueSoonResult.count || 0),
      overdueCount: (pibOverdueResult.count || 0) + (pebOverdueResult.count || 0),
      dueSoonDocuments: topDueSoonDocuments,
      
      // Recent Activity
      recentDocuments,
      
      // HS Code Usage
      frequentHSCodes,
    }
  }, CACHE_TTL)
}
