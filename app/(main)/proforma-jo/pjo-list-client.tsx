'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PJOWithRelations } from '@/types'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PJOTable } from '@/components/pjo/pjo-table'
import { PJOFilters } from '@/components/pjo/pjo-filters'
import { VarianceDashboard } from '@/components/pjo/variance-dashboard'
import { filterPJOs } from '@/lib/pjo-utils'
import { filterByMarketType, countByMarketType } from '@/lib/market-classification-utils'
import { deletePJO } from './actions'
import { useToast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'

interface PJOListClientProps {
  pjos: PJOWithRelations[]
  canSeeRevenue?: boolean
  canCreatePJO?: boolean
}

export function PJOListClient({ pjos, canSeeRevenue = true, canCreatePJO = true }: PJOListClientProps) {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [overrunFilter, setOverrunFilter] = useState(false)
  const [marketTypeFilter, setMarketTypeFilter] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pjoToDelete, setPjoToDelete] = useState<PJOWithRelations | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  let filteredPJOs = filterPJOs(
    pjos,
    statusFilter,
    dateFrom ?? null,
    dateTo ?? null
  )
  
  // Apply overrun filter
  if (overrunFilter) {
    filteredPJOs = filteredPJOs.filter(pjo => pjo.has_cost_overruns === true)
  }
  
  // Apply market type filter
  filteredPJOs = filterByMarketType(filteredPJOs, marketTypeFilter)
  
  // Calculate market type counts from all PJOs (before filtering)
  const marketTypeCounts = countByMarketType(pjos)

  function handleDeleteClick(pjo: PJOWithRelations) {
    setPjoToDelete(pjo)
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!pjoToDelete) return

    setIsDeleting(true)
    try {
      const result = await deletePJO(pjoToDelete.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'PJO deleted successfully' })
      }
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setPjoToDelete(null)
    }
  }

  function handleClearFilters() {
    setStatusFilter('all')
    setDateFrom(undefined)
    setDateTo(undefined)
    setOverrunFilter(false)
    setMarketTypeFilter('all')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proforma Job Orders</h1>
        {canCreatePJO && (
          <Button asChild>
            <Link href="/proforma-jo/new">
              <Plus className="mr-2 h-4 w-4" />
              Add PJO
            </Link>
          </Button>
        )}
      </div>

      {canSeeRevenue && <VarianceDashboard pjos={pjos} />}

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Simple: {marketTypeCounts.simple}</span>
        <span>Complex: {marketTypeCounts.complex}</span>
      </div>

      <PJOFilters
        statusFilter={statusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        overrunFilter={overrunFilter}
        marketTypeFilter={marketTypeFilter}
        onStatusChange={setStatusFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onOverrunFilterChange={setOverrunFilter}
        onMarketTypeChange={setMarketTypeFilter}
        onClearFilters={handleClearFilters}
      />

      <PJOTable pjos={filteredPJOs} onDelete={handleDeleteClick} canSeeRevenue={canSeeRevenue} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PJO</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete PJO {pjoToDelete?.pjo_number}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
