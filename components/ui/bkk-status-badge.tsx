'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BKK_STATUS_COLORS } from '@/lib/bkk-utils'
import type { BKKStatus } from '@/types'
import { format } from 'date-fns'

interface BKKStatusBadgeProps {
  status: BKKStatus
  showDetails?: boolean
  requestedAt?: string | null
  approvedAt?: string | null
  releasedAt?: string | null
  settledAt?: string | null
  requesterName?: string | null
  approverName?: string | null
  releaserName?: string | null
  settlerName?: string | null
  rejectionReason?: string | null
}

export function BKKStatusBadge({
  status,
  showDetails = false,
  requestedAt,
  approvedAt,
  releasedAt,
  settledAt,
  requesterName,
  approverName,
  releaserName,
  settlerName,
  rejectionReason
}: BKKStatusBadgeProps) {
  const statusInfo = BKK_STATUS_COLORS[status] || BKK_STATUS_COLORS.pending
  
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
    } catch {
      return null
    }
  }
  
  const badge = (
    <Badge className={`${statusInfo.bg} ${statusInfo.text} border-0`}>
      {statusInfo.label}
    </Badge>
  )
  
  if (!showDetails) {
    return badge
  }
  
  const details: string[] = []
  
  if (requestedAt) {
    details.push(`Requested: ${formatDate(requestedAt)}${requesterName ? ` by ${requesterName}` : ''}`)
  }
  
  if (status === 'approved' || status === 'released' || status === 'settled') {
    if (approvedAt) {
      details.push(`Approved: ${formatDate(approvedAt)}${approverName ? ` by ${approverName}` : ''}`)
    }
  }
  
  if (status === 'rejected') {
    if (approvedAt) {
      details.push(`Rejected: ${formatDate(approvedAt)}${approverName ? ` by ${approverName}` : ''}`)
    }
    if (rejectionReason) {
      details.push(`Reason: ${rejectionReason}`)
    }
  }
  
  if (status === 'released' || status === 'settled') {
    if (releasedAt) {
      details.push(`Released: ${formatDate(releasedAt)}${releaserName ? ` by ${releaserName}` : ''}`)
    }
  }
  
  if (status === 'settled') {
    if (settledAt) {
      details.push(`Settled: ${formatDate(settledAt)}${settlerName ? ` by ${settlerName}` : ''}`)
    }
  }
  
  if (details.length === 0) {
    return badge
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-sm">
            {details.map((detail, i) => (
              <p key={i}>{detail}</p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
