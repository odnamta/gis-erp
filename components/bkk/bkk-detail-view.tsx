'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BKKStatusBadge } from '@/components/ui/bkk-status-badge'
import { formatBKKCurrency } from '@/lib/bkk-utils'
import type { BKKWithRelations, BKKStatus } from '@/types'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { PDFButtons } from '@/components/pdf/pdf-buttons'

interface BKKDetailViewProps {
  bkk: BKKWithRelations
}

export function BKKDetailView({ bkk }: BKKDetailViewProps) {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
    } catch {
      return '-'
    }
  }

  const receiptUrls = Array.isArray(bkk.receipt_urls) ? bkk.receipt_urls : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>{bkk.bkk_number}</CardTitle>
              <PDFButtons
                documentType="bkk"
                documentId={bkk.id}
                documentNumber={bkk.bkk_number}
                size="sm"
                variant="outline"
              />
            </div>
            <BKKStatusBadge
              status={bkk.status as BKKStatus}
              showDetails
              requestedAt={bkk.requested_at}
              approvedAt={bkk.approved_at}
              releasedAt={bkk.released_at}
              settledAt={bkk.settled_at}
              requesterName={(bkk.requester as { full_name?: string })?.full_name}
              approverName={(bkk.approver as { full_name?: string })?.full_name}
              releaserName={(bkk.releaser as { full_name?: string })?.full_name}
              settlerName={(bkk.settler as { full_name?: string })?.full_name}
              rejectionReason={bkk.rejection_reason}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount Requested</p>
              <p className="text-xl font-bold">{formatBKKCurrency(bkk.amount_requested)}</p>
            </div>
            {bkk.amount_spent !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Amount Spent</p>
                <p className="text-xl font-bold">{formatBKKCurrency(bkk.amount_spent)}</p>
              </div>
            )}
            {bkk.amount_returned !== null && bkk.amount_returned > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Amount Returned</p>
                <p className="text-xl font-bold text-green-600">{formatBKKCurrency(bkk.amount_returned)}</p>
              </div>
            )}
            {bkk.budget_amount !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Budget Reference</p>
                <p className="text-xl font-bold text-muted-foreground">{formatBKKCurrency(bkk.budget_amount)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Purpose</p>
            <p>{bkk.purpose}</p>
          </div>
          
          {bkk.budget_category && (
            <div>
              <p className="text-sm text-muted-foreground">Budget Category</p>
              <Badge variant="outline">{bkk.budget_category}</Badge>
            </div>
          )}
          
          {bkk.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p>{bkk.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Request */}
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500" />
              <div className="flex-1">
                <p className="font-medium">Requested</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(bkk.requested_at)}
                  {(bkk.requester as { full_name?: string })?.full_name && 
                    ` by ${(bkk.requester as { full_name?: string }).full_name}`}
                </p>
              </div>
            </div>

            {/* Approval/Rejection */}
            {bkk.approved_at && (
              <>
                <Separator />
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-2 mt-2 rounded-full ${
                    bkk.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium">
                      {bkk.status === 'rejected' ? 'Rejected' : 'Approved'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(bkk.approved_at)}
                      {(bkk.approver as { full_name?: string })?.full_name && 
                        ` by ${(bkk.approver as { full_name?: string }).full_name}`}
                    </p>
                    {bkk.rejection_reason && (
                      <p className="text-sm text-red-600 mt-1">
                        Reason: {bkk.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Release */}
            {bkk.released_at && (
              <>
                <Separator />
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">Released</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(bkk.released_at)}
                      {(bkk.releaser as { full_name?: string })?.full_name && 
                        ` by ${(bkk.releaser as { full_name?: string }).full_name}`}
                    </p>
                    {bkk.release_method && (
                      <p className="text-sm mt-1">
                        Method: <Badge variant="outline">{bkk.release_method}</Badge>
                        {bkk.release_reference && ` (Ref: ${bkk.release_reference})`}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Settlement */}
            {bkk.settled_at && (
              <>
                <Separator />
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gray-500" />
                  <div className="flex-1">
                    <p className="font-medium">Settled</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(bkk.settled_at)}
                      {(bkk.settler as { full_name?: string })?.full_name && 
                        ` by ${(bkk.settler as { full_name?: string }).full_name}`}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipts */}
      {receiptUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {receiptUrls.map((url, index) => (
                <a
                  key={index}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-sm truncate">{url as string}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
