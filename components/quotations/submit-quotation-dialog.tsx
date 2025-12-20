'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { submitQuotation } from '@/app/(main)/quotations/actions'

interface SubmitQuotationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotationId: string
  quotationNumber: string
}

export function SubmitQuotationDialog({
  open,
  onOpenChange,
  quotationId,
  quotationNumber,
}: SubmitQuotationDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [submittedTo, setSubmittedTo] = useState('')

  async function handleSubmit() {
    if (!submittedTo.trim()) {
      toast({ title: 'Error', description: 'Please enter recipient', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await submitQuotation(quotationId, submittedTo.trim())
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Quotation submitted to client' })
        onOpenChange(false)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Quotation</DialogTitle>
          <DialogDescription>
            Submit {quotationNumber} to the client
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="submittedTo">Submitted To</Label>
            <Input
              id="submittedTo"
              placeholder="Client name or email"
              value={submittedTo}
              onChange={(e) => setSubmittedTo(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
