'use client'

import Link from 'next/link'
import { PJOWithRelations } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PJOStatusBadge } from '@/components/ui/pjo-status-badge'
import { MarketTypeBadge } from '@/components/ui/market-type-badge'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import { Pencil, Eye, Trash2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MarketType } from '@/types/market-classification'
import { useIsDesktop } from '@/hooks/use-media-query'

interface PJOTableProps {
  pjos: PJOWithRelations[]
  onDelete: (pjo: PJOWithRelations) => void
  canSeeRevenue?: boolean
}

export function PJOTable({ pjos, onDelete, canSeeRevenue = true }: PJOTableProps) {
  const isDesktop = useIsDesktop()

  if (pjos.length === 0) {
    return (
      <div className="rounded-md border p-6 text-center text-muted-foreground">
        No PJOs found. Create your first PJO to get started.
      </div>
    )
  }

  // Mobile card view
  if (!isDesktop) {
    return (
      <div className="space-y-3">
        {pjos.map((pjo) => (
          <Link key={pjo.id} href={`/proforma-jo/${pjo.id}`} className="block">
            <div className="rounded-lg border bg-card p-4 space-y-2 active:bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-sm">{pjo.pjo_number}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PJOStatusBadge status={pjo.status} />
                  {pjo.has_cost_overruns === true && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Overrun
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {pjo.projects?.customers?.company_name || pjo.projects?.customers?.name || '-'}
                {pjo.projects?.customers?.company_name && pjo.projects?.customers?.name && (
                  <span className="block text-xs text-muted-foreground/70">{pjo.projects.customers.name}</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{pjo.jo_date ? formatDate(pjo.jo_date) : '-'}</span>
                <MarketTypeBadge
                  marketType={pjo.market_type as MarketType | null}
                  score={pjo.complexity_score ?? undefined}
                  showScore
                />
              </div>
              {canSeeRevenue && (
                <div className="flex items-center justify-between text-sm pt-1 border-t">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">{formatIDR(pjo.total_revenue ?? 0)}</span>
                </div>
              )}
              {canSeeRevenue && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profit</span>
                  <span className={`font-medium ${(pjo.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatIDR(pjo.profit ?? 0)}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    )
  }

  // Desktop table view
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PJO Number</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Project</TableHead>
            {canSeeRevenue && <TableHead className="text-right">Revenue</TableHead>}
            {canSeeRevenue && <TableHead className="text-right">Profit</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pjos.map((pjo) => (
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
                {pjo.projects?.customers ? (
                  <Link
                    href={`/customers/${pjo.projects.customers.id}`}
                    className="hover:underline"
                  >
                    <span>{pjo.projects.customers.company_name || pjo.projects.customers.name}</span>
                    {pjo.projects.customers.company_name && (
                      <span className="block text-xs text-muted-foreground">{pjo.projects.customers.name}</span>
                    )}
                  </Link>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                {pjo.projects ? (
                  <Link href={`/projects/${pjo.projects.id}`} className="hover:underline">
                    {pjo.projects.name}
                  </Link>
                ) : (
                  '-'
                )}
              </TableCell>
              {canSeeRevenue && (
                <TableCell className="text-right">{formatIDR(pjo.total_revenue ?? 0)}</TableCell>
              )}
              {canSeeRevenue && (
                <TableCell
                  className={`text-right ${(pjo.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatIDR(pjo.profit ?? 0)}
                </TableCell>
              )}
              <TableCell>
                <MarketTypeBadge
                  marketType={pjo.market_type as MarketType | null}
                  score={pjo.complexity_score ?? undefined}
                  showScore
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <PJOStatusBadge status={pjo.status} />
                  {pjo.has_cost_overruns === true && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Overrun
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" asChild title="View PJO">
                    <Link href={`/proforma-jo/${pjo.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {pjo.status === 'draft' && (
                    <>
                      <Button variant="ghost" size="icon" asChild title="Edit PJO">
                        <Link href={`/proforma-jo/${pjo.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(pjo)}
                        title="Delete PJO"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
