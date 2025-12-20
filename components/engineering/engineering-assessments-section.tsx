'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssessmentCard } from './assessment-card'
import { getAssessmentCompletionPercentage, calculateTotalAdditionalCosts } from '@/lib/engineering-utils'
import { EngineeringAssessment } from '@/types/engineering'
import { Plus, HardHat, CheckCircle2, DollarSign } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface AssessmentWithUser extends EngineeringAssessment {
  assigned_user_name?: string | null
  completed_by_name?: string | null
}

interface EngineeringAssessmentsSectionProps {
  assessments: AssessmentWithUser[]
  canAddAssessment?: boolean
  canStartAssessment?: boolean
  canCompleteAssessment?: boolean
  canCancelAssessment?: boolean
  onAddAssessment?: () => void
  onStartAssessment?: (assessmentId: string) => void
  onCompleteAssessment?: (assessmentId: string) => void
  onCancelAssessment?: (assessmentId: string) => void
  isLoading?: boolean
}

export function EngineeringAssessmentsSection({
  assessments,
  canAddAssessment = false,
  canStartAssessment = false,
  canCompleteAssessment = false,
  canCancelAssessment = false,
  onAddAssessment,
  onStartAssessment,
  onCompleteAssessment,
  onCancelAssessment,
  isLoading = false,
}: EngineeringAssessmentsSectionProps) {
  const completionPercentage = getAssessmentCompletionPercentage(assessments)
  const totalAdditionalCosts = calculateTotalAdditionalCosts(assessments)
  const activeAssessments = assessments.filter(a => a.status !== 'cancelled')
  const completedCount = activeAssessments.filter(a => a.status === 'completed').length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Engineering Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Engineering Assessments
          </CardTitle>
          {canAddAssessment && onAddAssessment && (
            <Button size="sm" variant="outline" onClick={onAddAssessment}>
              <Plus className="h-4 w-4 mr-1" />
              Add Assessment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress summary */}
        {activeAssessments.length > 0 && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Progress
              </span>
              <span className="font-medium">
                {completedCount} / {activeAssessments.length} completed
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            
            {totalAdditionalCosts > 0 && (
              <div className="flex items-center justify-between text-sm pt-2 border-t mt-2">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  Total Additional Costs
                </span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(totalAdditionalCosts)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Assessment list */}
        {assessments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HardHat className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No assessments created yet.</p>
            {canAddAssessment && (
              <p className="text-sm mt-1">Click "Add Assessment" to create one.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {assessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                assignedUserName={assessment.assigned_user_name}
                completedByName={assessment.completed_by_name}
                canStart={canStartAssessment}
                canComplete={canCompleteAssessment}
                canCancel={canCancelAssessment}
                onStart={() => onStartAssessment?.(assessment.id)}
                onComplete={() => onCompleteAssessment?.(assessment.id)}
                onCancel={() => onCancelAssessment?.(assessment.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
