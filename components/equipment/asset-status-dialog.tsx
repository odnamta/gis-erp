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
import { Loader2 } from 'lucide-react'
import { AssetStatus, AssetLocation, StatusChangeFormData } from '@/types/assets'
import { ASSET_STATUSES } from '@/lib/asset-utils'
import { changeAssetStatus } from '@/lib/asset-actions'
import { toast } from 'sonner'

interface AssetStatusDialogProps {
  assetId: string
  currentStatus: AssetStatus
  locations: AssetLocation[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AssetStatusDialog({
  assetId,
  currentStatus,
  locations,
  open,
  onOpenChange,
  onSuccess,
}: AssetStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<StatusChangeFormData>({
    new_status: currentStatus,
    reason: '',
    new_location_id: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.reason.trim()) {
      toast.error('Reason is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await changeAssetStatus(assetId, formData)
      if (result.success) {
        toast.success('Status updated successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter out current status from options
  const availableStatuses = ASSET_STATUSES.filter(
    (s) => s.value !== currentStatus
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Change Asset Status</DialogTitle>
            <DialogDescription>
              Update the status of this asset. A reason is required for audit purposes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_status">New Status *</Label>
              <Select
                value={formData.new_status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, new_status: value as AssetStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Why is the status changing?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_location_id">New Location (Optional)</Label>
              <Select
                value={formData.new_location_id || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, new_location_id: value || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep current location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep current location</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
