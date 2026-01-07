'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  EngineeringResource,
  UnavailabilityType,
  UNAVAILABILITY_TYPE_LABELS,
} from '@/types/resource-scheduling'
import { setUnavailability } from '@/lib/resource-scheduling-actions'
import { getDatesInRange } from '@/lib/resource-scheduling-utils'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'

interface AvailabilityFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: EngineeringResource
  onSuccess: () => void
}

export function AvailabilityForm({
  open,
  onOpenChange,
  resource,
  onSuccess,
}: AvailabilityFormProps) {
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [unavailabilityType, setUnavailabilityType] = useState<UnavailabilityType>('leave')
  const [notes, setNotes] = useState('')
  const [conflicts, setConflicts] = useState<{ assignment_id: string; target_name: string }[]>([])

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select date range')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error('End date must be after start date')
      return
    }

    setLoading(true)
    try {
      const dates = getDatesInRange(startDate, endDate)
      const result = await setUnavailability({
        resource_id: resource.id,
        dates,
        unavailability_type: unavailabilityType,
        notes: notes || undefined,
      })

      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts as any)
        toast.error(`Unavailability set with ${result.conflicts.length} conflict(s)`)
      } else {
        toast.success(`${result.created} day(s) marked as unavailable`)
        onSuccess()
        resetForm()
      }
    } catch (error) {
      toast.error('Failed to set unavailability')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStartDate('')
    setEndDate('')
    setUnavailabilityType('leave')
    setNotes('')
    setConflicts([])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Unavailable - {resource.resource_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select
              value={unavailabilityType}
              onValueChange={(v) => setUnavailabilityType(v as UnavailabilityType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UNAVAILABILITY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>

          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  {conflicts.length} assignment(s) conflict with this unavailability:
                </p>
                <ul className="text-sm space-y-1">
                  {conflicts.map((c: any, i) => (
                    <li key={i}>
                      • {c.task_description || 'Assignment'} ({c.start_date} - {c.end_date})
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm">
                  The unavailability has been set. Please review and update the conflicting assignments.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Mark Unavailable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
