'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AssessmentStatusBadge,
  RiskLevelBadge,
} from '@/components/ui/engineering-status-badge'
import { formatDate } from '@/lib/pjo-utils'
import {
  EngineeringAssessment,
  AssessmentType,
  ASSESSMENT_TYPE_LABELS,
} from '@/types/engineering'
import {
  MapPin,
  FileSearch,
  FileCheck,
  Route,
  Play,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  DollarSign,
} from 'lucide-react'

interface AssessmentCardProps {
  assessment: EngineeringAssessment
  assignedUserName?: string | null
  completedByName?: string | null
  canStart?: boolean
  canComplete?: boolean
  canCancel?: boolean
  onStart?: () => void
  onComplete?: () => void
  onCancel?: () => void
}

const assessmentIcons: Record<AssessmentType, React.ReactNode> = {
  route_survey: <MapPin className="h-5 w-5" />,
  technical_review: <FileSearch className="h-5 w-5" />,
  permit_check: <FileCheck className="h-5 w-5" />,
  jmp_creation: <Route className="h-5 w-5" />,
}

export function AssessmentCard({
  assessment,
  assignedUserName,
  completedByName,
  canStart = false,
  canComplete = false,
  canCancel = false,
  onStart,
  onComplete,
  onCancel,
}: AssessmentCardProps) {
  const isPending = assessment.status === 'pending'
  const isInProgress = assessment.status === 'in_progress'
  const isCompleted = assessment.status === 'completed'
  const isCancelled = assessment.status === 'cancelled'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className={isCancelled ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {assessmentIcons[assessment.assessment_type]}
            {ASSESSMENT_TYPE_LABELS[assessment.assessment_type]}
          </CardTitle>
          <div className="flex items-center gap-2">
            {assessment.risk_level && <RiskLevelBadge level={assessment.risk_level} />}
            <AssessmentStatusBadge status={assessment.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Assignment info */}
        {assessment.assigned_to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>
              Assigned to <span className="font-medium text-foreground">{assignedUserName || 'Engineer'}</span>
            </span>
            {assessment.assigned_at && (
              <>
                <Calendar className="h-4 w-4 ml-2" />
                <span>{formatDate(assessment.assigned_at)}</span>
              </>
            )}
          </div>
        )}

        {/* Completion info */}
        {isCompleted && assessment.completed_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              Completed by <span className="font-medium text-foreground">{completedByName || 'Engineer'}</span>
              {' '}on {formatDate(assessment.completed_at)}
            </span>
          </div>
        )}

        {/* Findings */}
        {assessment.findings && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Findings</p>
            <p className="text-sm text-muted-foreground">{assessment.findings}</p>
          </div>
        )}

        {/* Recommendations */}
        {assessment.recommendations && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Recommendations</p>
            <p className="text-sm text-muted-foreground">{assessment.recommendations}</p>
          </div>
        )}

        {/* Additional cost */}
        {assessment.additional_cost_estimate !== null && assessment.additional_cost_estimate !== undefined && assessment.additional_cost_estimate > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-orange-600" />
            <span>
              Additional Cost: <span className="font-medium">{formatCurrency(assessment.additional_cost_estimate)}</span>
            </span>
          </div>
        )}

        {/* Cost justification */}
        {assessment.cost_justification && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Cost Justification</p>
            <p className="text-sm text-muted-foreground">{assessment.cost_justification}</p>
          </div>
        )}

        {/* Notes */}
        {assessment.notes && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Notes</p>
            <p className="text-sm text-muted-foreground">{assessment.notes}</p>
          </div>
        )}

        {/* Action buttons */}
        {!isCancelled && (
          <div className="flex gap-2 pt-2">
            {canStart && isPending && onStart && (
              <Button size="sm" variant="outline" onClick={onStart}>
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            {canComplete && (isPending || isInProgress) && onComplete && (
              <Button size="sm" variant="default" onClick={onComplete}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            {canCancel && (isPending || isInProgress) && onCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
