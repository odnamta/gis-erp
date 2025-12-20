'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { markQuotationLost } from '@/app/(main)/quotations/actions'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkLostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotationId: string
  quotationNumber: string
}

export function MarkLostDialog({
  open,
  onOpenChange,
  quotationId,
  quotationNumber,
}: MarkLostDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [outcomeDate, setOutcomeDate] = useState<Date | undefined>(new Date())
  const [reason, setReason] = useState('')

  async function handleSubmit() {
    if (!outcomeDate) {
      toast({ title: 'Error', description: 'Please select outcome date', variant: 'destructive' })
      return
    }
    if (!reason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await markQuotationLost(quotationId, format(outcomeDate, 'yyyy-MM-dd'), reason.trim())
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Recorded', description: 'Quotation marked as lost' })
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
          <DialogTitle>Mark Quotation as Lost</DialogTitle>
          <DialogDescription>
            Record the loss for {quotationNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Loss Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !outcomeDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {outcomeDate ? format(outcomeDate, 'dd/MM/yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={outcomeDate}
                  onSelect={setOutcomeDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Loss</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Price too high, Lost to competitor, Client cancelled project..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Mark as Lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
