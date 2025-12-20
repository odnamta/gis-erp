'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RiskLevel,
  EngineeringDecision,
  RISK_LEVEL_LABELS,
  DECISION_LABELS,
  EngineeringAssessment,
} from '@/types/engineering'
import { RiskLevelBadge } from '@/components/ui/engineering-status-badge'
import { calculateTotalAdditionalCosts, getHighestRiskLevel } from '@/lib/engineering-utils'
import { Loader2, DollarSign, AlertTriangle } from 'lucide-react'

interface CompleteReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pjoId: string
  assessments: Pick<EngineeringAssessment, 'status' | 'additional_cost_estimate' | 'risk_level'>[]
  onComplete: (data: {
    overall_risk_level: RiskLevel
    decision: EngineeringDecision
    engineering_notes: string
    apply_additional_costs: boolean
  }) => Promise<{ error?: string }>
}

export function CompleteReviewDialog({
  open,
  onOpenChange,
  pjoId,
  assessments,
  onComplete,
}: CompleteReviewDialogProps) {
  const totalAdditionalCosts = calculateTotalAdditionalCosts(assessments)
  const suggestedRiskLevel = getHighestRiskLevel(assessments) as RiskLevel | null

  const [overallRiskLevel, setOverallRiskLevel] = useState<RiskLevel | ''>(suggestedRiskLevel || '')
  const [decision, setDecision] = useState<EngineeringDecision | ''>('')
  const [engineeringNotes, setEngineeringNotes] = useState('')
  const [applyAdditionalCosts, setApplyAdditionalCosts] = useState(totalAdditionalCosts > 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSubmit = async () => {
    if (!overallRiskLevel) {
      setError('Overall risk level is required')
      return
    }
    if (!decision) {
      setError('Decision is required')
      return
    }
    if (!engineeringNotes.trim()) {
      setError('Engineering notes are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await onComplete({
      overall_risk_level: overallRiskLevel,
      decision,
      engineering_notes: engineeringNotes.trim(),
      apply_additional_costs: applyAdditionalCosts,
    })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      resetForm()
      onOpenChange(false)
    }
  }

  const resetForm = () => {
    setOverallRiskLevel(suggestedRiskLevel || '')
    setDecision('')
    setEngineeringNotes('')
    setApplyAdditionalCosts(totalAdditionalCosts > 0)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Engineering Review</DialogTitle>
          <DialogDescription>
            Finalize the engineering review with your overall assessment and decision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Assessment summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Assessment Summary</p>
            <div className="flex items-center justify-between text-sm">
              <span>Completed Assessments</span>
              <span className="font-medium">
                {assessments.filter(a => a.status === 'completed').length} / {assessments.length}
              </span>
            </div>
            {suggestedRiskLevel && (
              <div className="flex items-center justify-between text-sm">
                <span>Highest Risk Level</span>
                <RiskLevelBadge level={suggestedRiskLevel} />
              </div>
            )}
            {totalAdditionalCosts > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  Total Additional Costs
                </span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(totalAdditionalCosts)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="overall_risk_level">Overall Risk Level *</Label>
            <Select value={overallRiskLevel} onValueChange={(v) => setOverallRiskLevel(v as RiskLevel)}>
              <SelectTrigger>
                <SelectValue placeholder="Select overall risk level" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RISK_LEVEL_LABELS) as RiskLevel[]).map((level) => (
                  <SelectItem key={level} value={level}>
                    {RISK_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision">Decision *</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as EngineeringDecision)}>
              <SelectTrigger>
                <SelectValue placeholder="Select decision" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DECISION_LABELS) as EngineeringDecision[]).map((d) => (
                  <SelectItem key={d} value={d}>
                    {DECISION_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="engineering_notes">Engineering Notes *</Label>
            <Textarea
              id="engineering_notes"
              placeholder="Provide overall notes and any conditions for approval..."
              value={engineeringNotes}
              onChange={(e) => setEngineeringNotes(e.target.value)}
              rows={4}
            />
          </div>

          {totalAdditionalCosts > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="apply_costs"
                checked={applyAdditionalCosts}
                onCheckedChange={(checked) => setApplyAdditionalCosts(checked === true)}
              />
              <Label htmlFor="apply_costs" className="text-sm font-normal">
                Apply additional costs ({formatCurrency(totalAdditionalCosts)}) to PJO
              </Label>
            </div>
          )}

          {decision === 'not_recommended' || decision === 'rejected' ? (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                This decision will be recorded but will not block PJO approval. 
                The manager can still approve the PJO if they choose to proceed.
              </p>
            </div>
          ) : null}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Complete Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
