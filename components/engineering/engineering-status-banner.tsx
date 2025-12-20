'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EngineeringStatusBadge } from '@/components/ui/engineering-status-badge'
import { formatDate } from '@/lib/pjo-utils'
import {
  EngineeringStatus,
  ComplexityFactor,
  ENGINEERING_STATUS_LABELS,
} from '@/types/engineering'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardHat,
  Shield,
  UserPlus,
  FileCheck,
} from 'lucide-react'

interface EngineeringStatusBannerProps {
  status: EngineeringStatus
  assignedTo?: string | null
  assignedToName?: string | null
  assignedAt?: string | null
  completedAt?: string | null
  completedByName?: string | null
  waivedReason?: string | null
  complexityFactors?: ComplexityFactor[] | null
  complexityScore?: number | null
  canAssign?: boolean
  canComplete?: boolean
  canWaive?: boolean
  onAssign?: () => void
  onComplete?: () => void
  onWaive?: () => void
}

export function EngineeringStatusBanner({
  status,
  assignedTo,
  assignedToName,
  assignedAt,
  completedAt,
  completedByName,
  waivedReason,
  complexityFactors,
  complexityScore,
  canAssign = false,
  canComplete = false,
  canWaive = false,
  onAssign,
  onComplete,
  onWaive,
}: EngineeringStatusBannerProps) {
  const isPending = status === 'pending'
  const isInProgress = status === 'in_progress'
  const isCompleted = status === 'completed'
  const isWaived = status === 'waived'
  const blocksApproval = isPending || isInProgress

  const getAlertVariant = () => {
    if (isCompleted || isWaived) return 'default'
    if (blocksApproval) return 'destructive'
    return 'default'
  }

  const getIcon = () => {
    if (isCompleted) return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (isWaived) return <Shield className="h-5 w-5 text-purple-600" />
    if (isInProgress) return <HardHat className="h-5 w-5 text-blue-600" />
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />
  }

  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2 mb-2">
            Engineering Review Required
            <EngineeringStatusBadge status={status} />
          </AlertTitle>
          <AlertDescription className="space-y-3">
            {/* Complexity info */}
            {complexityScore !== null && complexityScore !== undefined && (
              <p className="text-sm">
                Complexity Score: <span className="font-medium">{complexityScore}</span>
                {complexityFactors && complexityFactors.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}({complexityFactors.map(f => f.criteria_name).join(', ')})
                  </span>
                )}
              </p>
            )}

            {/* Status-specific messages */}
            {isPending && !assignedTo && (
              <p className="text-sm text-yellow-700">
                This PJO requires engineering review before approval. Please assign an engineer to review.
              </p>
            )}

            {isPending && assignedTo && (
              <p className="text-sm">
                Assigned to <span className="font-medium">{assignedToName || 'Engineer'}</span>
                {assignedAt && <span className="text-muted-foreground"> on {formatDate(assignedAt)}</span>}
              </p>
            )}

            {isInProgress && (
              <p className="text-sm text-blue-700">
                Engineering review is in progress by <span className="font-medium">{assignedToName || 'Engineer'}</span>.
                Approval is blocked until review is completed.
              </p>
            )}

            {isCompleted && (
              <p className="text-sm text-green-700">
                Engineering review completed
                {completedByName && <span> by <span className="font-medium">{completedByName}</span></span>}
                {completedAt && <span className="text-muted-foreground"> on {formatDate(completedAt)}</span>}
              </p>
            )}

            {isWaived && (
              <div className="text-sm text-purple-700">
                <p>Engineering review was waived.</p>
                {waivedReason && (
                  <p className="mt-1 text-muted-foreground">Reason: {waivedReason}</p>
                )}
              </div>
            )}

            {/* Approval blocked warning */}
            {blocksApproval && (
              <p className="text-sm font-medium text-destructive">
                ⚠️ PJO approval is blocked until engineering review is completed or waived.
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              {canAssign && isPending && !assignedTo && onAssign && (
                <Button size="sm" variant="outline" onClick={onAssign}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign Engineer
                </Button>
              )}
              {canComplete && (isPending || isInProgress) && onComplete && (
                <Button size="sm" variant="default" onClick={onComplete}>
                  <FileCheck className="h-4 w-4 mr-1" />
                  Complete Review
                </Button>
              )}
              {canWaive && (isPending || isInProgress) && onWaive && (
                <Button size="sm" variant="secondary" onClick={onWaive}>
                  <Shield className="h-4 w-4 mr-1" />
                  Waive Review
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}
