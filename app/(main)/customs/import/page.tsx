import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PIBSummaryCards, PIBList, PIBFiltersComponent } from '@/components/pib'
import { getPIBDocuments, getPIBStatistics, getCustomsOffices } from '@/lib/pib-actions'
import { PIBFilters } from '@/types/pib'
import { Plus, FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils'
import { canViewPIB, canCreatePIB } from '@/lib/permissions'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'

interface PageProps {
  searchParams: Promise<{
    status?: string
    customs_office_id?: string
    date_from?: string
    date_to?: string
    search?: string
  }>
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[120px]" />
        ))}
      </div>
      <Skeleton className="h-[60px]" />
      <Skeleton className="h-[400px]" />
    </div>
  )
}

async function PIBContent({ filters }: { filters: PIBFilters }) {
  // Parallel fetch - all 3 requests run simultaneously
  const [documentsResult, statisticsResult, officesResult] = await Promise.all([
    getPIBDocuments(filters),
    getPIBStatistics(),
    getCustomsOffices(),
  ])

  const documents = documentsResult.data || []
  const statistics = statisticsResult.data || {
    active_pibs: 0,
    pending_clearance: 0,
    in_transit: 0,
    released_mtd: 0,
  }
  const customsOffices = officesResult.data || []

  return (
    <div className="space-y-6">
      <PIBSummaryCards statistics={statistics} />
      <PIBFiltersComponent filters={filters} customsOffices={customsOffices} />
      <PIBList documents={documents} />
    </div>
  )
}

export default async function CustomsImportPage({ searchParams }: PageProps) {
  // Permission check
  const profile = await getCurrentUserProfile()
  const { explorerReadOnly } = await guardPage(canViewPIB(profile))

  const params = await searchParams
  
  const filters: PIBFilters = {
    status: params.status as PIBFilters['status'],
    customs_office_id: params.customs_office_id,
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
  }

  const showCreateButton = canCreatePIB(profile)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Import Documents (PIB)</h1>
            <p className="text-muted-foreground">
              Manage customs import declarations
            </p>
          </div>
        </div>
        {showCreateButton && (
          <Button asChild>
            <Link href="/customs/import/new">
              <Plus className="mr-2 h-4 w-4" />
              New PIB
            </Link>
          </Button>
        )}
      </div>

      {/* Content - single Suspense with parallel data fetching */}
      <Suspense fallback={<LoadingSkeleton />}>
        <PIBContent filters={filters} />
      </Suspense>
    </div>
  )
}
