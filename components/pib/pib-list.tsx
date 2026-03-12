'use client'

import Link from 'next/link'
import { PIBDocumentWithRelations } from '@/types/pib'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PIBStatusBadge } from './pib-status-badge'
import { formatCurrency, formatPIBDate, formatTransportMode } from '@/lib/pib-utils'
import { Eye, Pencil, Trash2, Ship, Plane, Truck } from 'lucide-react'

interface PIBListProps {
  documents: PIBDocumentWithRelations[]
  onDelete?: (pib: PIBDocumentWithRelations) => void
}

function TransportIcon({ mode }: { mode: string | null }) {
  if (!mode) return null
  switch (mode) {
    case 'sea':
      return <Ship className="h-4 w-4 text-blue-500" />
    case 'air':
      return <Plane className="h-4 w-4 text-sky-500" />
    case 'land':
      return <Truck className="h-4 w-4 text-amber-500" />
    default:
      return null
  }
}

export function PIBList({ documents, onDelete }: PIBListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Importer</TableHead>
            <TableHead>Transport</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead className="text-right">CIF Value</TableHead>
            <TableHead>Job Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No PIB documents found.
              </TableCell>
            </TableRow>
          ) : (
            documents.map((pib) => (
              <TableRow key={pib.id}>
                <TableCell className="font-medium">
                  <Link href={`/customs/import/${pib.id}`} className="hover:underline">
                    <div>{pib.internal_ref}</div>
                    {pib.pib_number && (
                      <div className="text-xs text-muted-foreground">
                        PIB: {pib.pib_number}
                      </div>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <div>{pib.importer_name}</div>
                  {pib.customer && (
                    <div className="text-xs text-muted-foreground">
                      {pib.customer.name}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TransportIcon mode={pib.transport_mode} />
                    <span className="text-sm">
                      {pib.transport_mode ? formatTransportMode(pib.transport_mode) : '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatPIBDate(pib.eta_date)}</TableCell>
                <TableCell className="text-right">
                  {pib.cif_value
                    ? formatCurrency(pib.cif_value, pib.currency)
                    : '-'}
                </TableCell>
                <TableCell>
                  {pib.job_order ? (
                    <Link
                      href={`/job-orders/${pib.job_order.id}`}
                      className="text-sm hover:underline"
                    >
                      {pib.job_order.jo_number}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <PIBStatusBadge status={pib.status} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" asChild title="View PIB">
                      <Link href={`/customs/import/${pib.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {pib.status === 'draft' && (
                      <>
                        <Button variant="ghost" size="icon" asChild title="Edit PIB">
                          <Link href={`/customs/import/${pib.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(pib)}
                            title="Delete PIB"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
