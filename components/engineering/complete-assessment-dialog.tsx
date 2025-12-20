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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RiskLevel, RISK_LEVEL_LABELS, ASSESSMENT_TYPE_LABELS, AssessmentType } from '@/types/engineering'
import { Loader2 } from 'lucide-react'

interface CompleteAssessmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assessmentId: string
  assessmentType: AssessmentType
  onComplete: (data: {
    findings: string
    recommendations: string
    risk_level: RiskLevel
    additional_cost_estimate?: number
    cost_justification?: string
  }) => Promise<{ error?: string }>
}

export function CompleteAssessmentDialog({
  open,
  onOpenChange,
  assessmentId,
  assessmentType,
  onComplete,
}: CompleteAssessmentDialogProps) {
  const [findings, setFindings] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('')
  const [additionalCost, setAdditionalCost] = useState('')
  const [costJustification, setCostJustification] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!findings.trim()) {
      setError('Findings are required')
      return
    }
    if (!recommendations.trim()) {
      setError('Recommendations are required')
      return
    }
    if (!riskLevel) {
      setError('Risk level is required')
      return
    }

    const costAmount = additionalCost ? parseFloat(additionalCost) : undefined
    if (costAmount && costAmount > 0 && !costJustification.trim()) {
      setError('Cost justification is required when additional cost is specified')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await onComplete({
      findings: findings.trim(),
      recommendations: recommendations.trim(),
      risk_level: riskLevel,
      additional_cost_estimate: costAmount,
      cost_justification: costJustification.trim() || undefined,
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
    setFindings('')
    setRecommendations('')
    setRiskLevel('')
    setAdditionalCost('')
    setCostJustification('')
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Assessment</DialogTitle>
          <DialogDescription>
            Complete the {ASSESSMENT_TYPE_LABELS[assessmentType]} assessment with your findings and recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="findings">Findings *</Label>
            <Textarea
              id="findings"
              placeholder="Describe your findings from the assessment..."
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendations">Recommendations *</Label>
            <Textarea
              id="recommendations"
              placeholder="Provide your recommendations..."
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk_level">Risk Level *</Label>
            <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
              <SelectTrigger>
                <SelectValue placeholder="Select risk level" />
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
            <Label htmlFor="additional_cost">Additional Cost Estimate (IDR)</Label>
            <Input
              id="additional_cost"
              type="number"
              placeholder="0"
              value={additionalCost}
              onChange={(e) => setAdditionalCost(e.target.value)}
              min={0}
            />
          </div>

          {additionalCost && parseFloat(additionalCost) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="cost_justification">Cost Justification *</Label>
              <Textarea
                id="cost_justification"
                placeholder="Explain why additional costs are needed..."
                value={costJustification}
                onChange={(e) => setCostJustification(e.target.value)}
                rows={2}
              />
            </div>
          )}

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
            Complete Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
