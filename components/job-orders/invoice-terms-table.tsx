'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InvoiceTerm, TermStatus } from '@/types'
import {
  getTermStatus,
  getTermStatusLabel,
  getLockedTriggerDescription,
  calculateTermInvoiceTotals,
  TRIGGER_LABELS,
} from '@/lib/invoice-terms-utils'
import { formatIDR } from '@/lib/pjo-utils'
import { generateSplitInvoice } from '@/app/(main)/invoices/actions'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Eye, Plus, Lock, CheckCircle, Clock } from 'lucide-react'

interface InvoiceTermsTableProps {
  terms: InvoiceTerm[]
  revenue: number
  joId: string
  joStatus: string
  totalInvoiced: number
  hasSuratJalan?: boolean
  hasBeritaAcara?: boolean
}

interface JOInvoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  invoice_term: string | null
}

export function InvoiceTermsTable({
  terms,
  revenue,
  joId,
  joStatus,
  totalInvoiced,
  hasSuratJalan = false,
  hasBeritaAcara = false,
}: InvoiceTermsTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null)


  const totalInvoiceable = revenue * 1.11 // Revenue + 11% VAT

  const getStatusBadge = (status: TermStatus, trigger: string) => {
    switch (status) {
      case 'invoiced':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Invoiced
          </Badge>
        )
      case 'ready':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Clock className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        )
      case 'locked':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Lock className="h-3 w-3 mr-1" />
            {getLockedTriggerDescription(trigger as any)}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            Pending
          </Badge>
        )
    }
  }

  const handleCreateInvoice = async (termIndex: number) => {
    setLoadingIndex(termIndex)
    try {
      const result = await generateSplitInvoice(joId, termIndex)
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: `Invoice ${result.data?.invoice_number} created`,
        })
        router.refresh()
      }
    } finally {
      setLoadingIndex(null)
    }
  }

  if (terms.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No invoice terms configured. Set up payment terms to generate invoices.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Term</TableHead>
            <TableHead className="text-right">Percentage</TableHead>
            <TableHead className="text-right">Amount (incl. VAT)</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {terms.map((term, index) => {
            const status = getTermStatus(term, joStatus, hasSuratJalan, hasBeritaAcara)
            const { totalAmount } = calculateTermInvoiceTotals(revenue, term.percentage)
            
            return (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {term.description}
                </TableCell>
                <TableCell className="text-right">
                  {term.percentage}%
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatIDR(totalAmount)}
                </TableCell>
                <TableCell>
                  {TRIGGER_LABELS[term.trigger]}
                </TableCell>
                <TableCell>
                  {getStatusBadge(status, term.trigger)}
                </TableCell>
                <TableCell>
                  {term.invoice_id ? (
                    <Link
                      href={`/invoices/${term.invoice_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {status === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => handleCreateInvoice(index)}
                      disabled={loadingIndex !== null}
                    >
                      {loadingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Create
                        </>
                      )}
                    </Button>
                  )}
                  {status === 'invoiced' && term.invoice_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/invoices/${term.invoice_id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Summary */}
      <div className="flex justify-end pt-4 border-t">
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total Invoiced</div>
          <div className="text-lg font-semibold">
            {formatIDR(totalInvoiced)} / {formatIDR(totalInvoiceable)}
          </div>
        </div>
      </div>
    </div>
  )
}