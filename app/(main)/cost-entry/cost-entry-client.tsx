'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calculator, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { formatIDR, formatDate } from '@/lib/pjo-utils'

interface CostItem {
  id: string
  category: string
  description: string
  estimated_amount: number
  actual_amount: number | null
  status: string
}

interface PJOForCostEntry {
  id: string
  pjo_number: string
  status: string
  commodity: string | null
  total_expenses: number
  jo_date: string | null
  pol: string | null
  pod: string | null
  created_at: string | null
  updated_at: string | null
  converted_to_jo: boolean | null
  projects: {
    id: string
    name: string
    customers: {
      id: string
      name: string
    } | null
  } | null
  pjo_cost_items: CostItem[]
}

interface CostEntryClientProps {
  pjos: PJOForCostEntry[]
  userRole: string
}

function getCostStatus(items: CostItem[]): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; confirmed: number; total: number } {
  if (items.length === 0) return { label: 'No Items', variant: 'outline', confirmed: 0, total: 0 }

  const confirmed = items.filter(i => i.status === 'confirmed' || i.status === 'under_budget' || i.status === 'exceeded').length
  const total = items.length

  if (confirmed === total) return { label: 'All Confirmed', variant: 'default', confirmed, total }
  if (confirmed > 0) return { label: `${confirmed}/${total} Done`, variant: 'secondary', confirmed, total }
  return { label: 'Pending', variant: 'destructive', confirmed, total }
}

export function CostEntryClient({ pjos, userRole: _userRole }: CostEntryClientProps) {
  const totalPending = pjos.filter(p => {
    const status = getCostStatus(p.pjo_cost_items)
    return status.confirmed < status.total
  }).length

  const totalConfirmed = pjos.filter(p => {
    const status = getCostStatus(p.pjo_cost_items)
    return status.total > 0 && status.confirmed === status.total
  }).length

  const totalEstimatedCost = pjos.reduce((sum, p) => sum + (p.total_expenses || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cost Entry</h1>
        <p className="text-muted-foreground">
          Confirm actual costs for approved Proforma Job Orders
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Confirmation</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
            <p className="text-xs text-muted-foreground">PJOs need cost input</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConfirmed}</div>
            <p className="text-xs text-muted-foreground">PJOs fully confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimated Cost</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(totalEstimatedCost)}</div>
            <p className="text-xs text-muted-foreground">Across all PJOs</p>
          </CardContent>
        </Card>
      </div>

      {/* PJO Table */}
      <Card>
        <CardHeader>
          <CardTitle>Approved PJOs - Cost Confirmation Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PJO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Estimated Cost</TableHead>
                  <TableHead>Confirmation</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pjos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No approved PJOs pending cost confirmation.
                    </TableCell>
                  </TableRow>
                ) : (
                  pjos.map((pjo) => {
                    const costStatus = getCostStatus(pjo.pjo_cost_items)
                    const hasOverruns = pjo.pjo_cost_items.some(i => i.status === 'exceeded')

                    return (
                      <TableRow key={pjo.id}>
                        <TableCell className="font-medium">
                          <Link href={`/proforma-jo/${pjo.id}`} className="hover:underline">
                            {pjo.pjo_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {pjo.jo_date ? formatDate(pjo.jo_date) : '-'}
                        </TableCell>
                        <TableCell>
                          {pjo.projects?.customers?.name || '-'}
                        </TableCell>
                        <TableCell>{pjo.commodity || '-'}</TableCell>
                        <TableCell>
                          {pjo.pol && pjo.pod ? `${pjo.pol} → ${pjo.pod}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatIDR(pjo.total_expenses || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={costStatus.variant}>
                              {costStatus.label}
                            </Badge>
                            {hasOverruns && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant={costStatus.confirmed < costStatus.total ? 'default' : 'outline'}>
                            <Link href={`/proforma-jo/${pjo.id}/costs`}>
                              {costStatus.confirmed < costStatus.total ? 'Fill Costs' : 'View'}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
