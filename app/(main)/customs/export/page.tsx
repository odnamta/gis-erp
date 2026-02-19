import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PEBSummaryCards, PEBList, PEBFiltersComponent } from '@/components/peb'
import { getPEBDocuments, getPEBStatistics, getCustomsOffices } from '@/lib/peb-actions'
import { PEBFilters } from '@/types/peb'
import { Plus, FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils'
import { canViewPEB, canCreatePEB } from '@/lib/permissions'
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

async function PEBContent({ filters }: { filters: PEBFilters }) {
  const [documentsResult, statisticsResult, officesResult] = await Promise.all([
    getPEBDocuments(filters),
    getPEBStatistics(),
    getCustomsOffices(),
  ])

  const documents = documentsResult.data
  const statistics = statisticsResult.data || {
    active_pebs: 0,
    pending_approval: 0,
    loaded: 0,
    departed_mtd: 0,
  }
  const customsOffices = officesResult.data

  return (
    <div className="space-y-6">
      <PEBSummaryCards statistics={statistics} />
      <PEBFiltersComponent filters={filters} customsOffices={customsOffices} onFiltersChange={() => {}} />
      <PEBList documents={documents} />
    </div>
  )
}

export default async function CustomsExportPage({ searchParams }: PageProps) {
  // Permission check
  const profile = await getCurrentUserProfile()
  const { explorerReadOnly } = await guardPage(canViewPEB(profile))

  const params = await searchParams

  const filters: PEBFilters = {
    status: params.status as PEBFilters['status'],
    customs_office_id: params.customs_office_id,
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
  }

  const showCreateButton = canCreatePEB(profile)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Export Documents (PEB)</h1>
            <p className="text-muted-foreground">Manage customs export declarations</p>
          </div>
        </div>
        {showCreateButton && (
          <Button asChild>
            <Link href="/customs/export/new">
              <Plus className="mr-2 h-4 w-4" />
              New PEB
            </Link>
          </Button>
        )}
      </div>

      {/* Content */}
      <Suspense fallback={<LoadingSkeleton />}>
        <PEBContent filters={filters} />
      </Suspense>
    </div>
  )
}
