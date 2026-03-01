'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  LostReasonCategory,
  LOST_REASON_LABELS,
  formatOutcomeReason,
} from '@/types/quotation'
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
  const [lostCategory, setLostCategory] = useState<LostReasonCategory | undefined>(undefined)
  const [detail, setDetail] = useState('')

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      // Reset form when closing
      setLostCategory(undefined)
      setDetail('')
      setOutcomeDate(new Date())
    }
    onOpenChange(newOpen)
  }

  async function handleSubmit() {
    if (!outcomeDate) {
      toast({ title: 'Error', description: 'Pilih tanggal kekalahan', variant: 'destructive' })
      return
    }
    if (!lostCategory) {
      toast({ title: 'Error', description: 'Pilih kategori alasan', variant: 'destructive' })
      return
    }
    if (lostCategory === 'lainnya' && !detail.trim()) {
      toast({ title: 'Error', description: 'Jelaskan alasan kekalahan', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const outcomeReason = formatOutcomeReason(lostCategory, detail)
      const result = await markQuotationLost(quotationId, format(outcomeDate, 'yyyy-MM-dd'), outcomeReason)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Tercatat', description: 'Quotation ditandai sebagai kalah' })
        handleOpenChange(false)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tandai Quotation Kalah</DialogTitle>
          <DialogDescription>
            Catat alasan kekalahan untuk {quotationNumber}. Data ini membantu evaluasi marketing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Loss Date */}
          <div className="space-y-2">
            <Label>Tanggal Kekalahan</Label>
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
                  {outcomeDate ? format(outcomeDate, 'dd/MM/yyyy') : 'Pilih tanggal'}
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

          {/* Lost Reason Category */}
          <div className="space-y-2">
            <Label>Kategori Alasan Kalah</Label>
            <Select
              value={lostCategory || ''}
              onValueChange={(v) => setLostCategory(v as LostReasonCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih alasan..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(LOST_REASON_LABELS) as [LostReasonCategory, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Detail / Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="detail">
              {lostCategory === 'lainnya' ? 'Jelaskan alasan *' : 'Catatan tambahan (opsional)'}
            </Label>
            <Textarea
              id="detail"
              placeholder={
                lostCategory === 'harga_tinggi'
                  ? 'Contoh: Selisih 15% dari kompetitor, customer minta diskon lebih...'
                  : lostCategory === 'kalah_kompetitor'
                    ? 'Contoh: Kalah dari PT. XYZ, mereka menawarkan harga lebih rendah...'
                    : lostCategory === 'teknikal_issue'
                      ? 'Contoh: Tidak bisa memenuhi spesifikasi alat berat yang diminta...'
                      : lostCategory === 'customer_cancel'
                        ? 'Contoh: Proyek ditunda/dibatalkan oleh customer...'
                        : 'Jelaskan alasan quotation tidak berhasil...'
              }
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isLoading || !lostCategory}>
            {isLoading ? 'Menyimpan...' : 'Tandai Kalah'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
