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
import { AlertTriangle, Loader2, Shield } from 'lucide-react'

interface WaiveReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pjoId: string
  pjoNumber: string
  onWaive: (reason: string) => Promise<{ error?: string }>
}

export function WaiveReviewDialog({
  open,
  onOpenChange,
  pjoId,
  pjoNumber,
  onWaive,
}: WaiveReviewDialogProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Waiver reason is required')
      return
    }
    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (minimum 10 characters)')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await onWaive(reason.trim())

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      resetForm()
      onOpenChange(false)
    }
  }

  const resetForm = () => {
    setReason('')
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Waive Engineering Review
          </DialogTitle>
          <DialogDescription>
            Waive the engineering review requirement for PJO {pjoNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Warning</p>
              <p className="mt-1">
                Waiving the engineering review will allow this PJO to proceed to approval 
                without completing the required technical assessments. This action should 
                only be taken when you are confident the project can proceed safely.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Waiver Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why the engineering review is being waived..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be recorded for audit purposes.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Waive Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
