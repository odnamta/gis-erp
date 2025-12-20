'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { markQuotationWon } from '@/app/(main)/quotations/actions'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkWonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotationId: string
  quotationNumber: string
}

export function MarkWonDialog({
  open,
  onOpenChange,
  quotationId,
  quotationNumber,
}: MarkWonDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [outcomeDate, setOutcomeDate] = useState<Date | undefined>(new Date())

  async function handleSubmit() {
    if (!outcomeDate) {
      toast({ title: 'Error', description: 'Please select outcome date', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await markQuotationWon(quotationId, format(outcomeDate, 'yyyy-MM-dd'))
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Quotation marked as won!' })
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
          <DialogTitle>Mark Quotation as Won</DialogTitle>
          <DialogDescription>
            Congratulations! Mark {quotationNumber} as won.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Award Date</Label>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            {isLoading ? 'Saving...' : 'Mark as Won'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
