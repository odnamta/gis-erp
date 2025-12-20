'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { convertToPJO } from '@/app/(main)/quotations/actions'
import { QuotationWithRelations } from '@/types/quotation'
import { formatIDR } from '@/lib/pjo-utils'
import { calculatePursuitCostPerShipment } from '@/lib/quotation-utils'

interface ConvertToPJODialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: QuotationWithRelations
}

export function ConvertToPJODialog({
  open,
  onOpenChange,
  quotation,
}: ConvertToPJODialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [splitByShipments, setSplitByShipments] = useState(false)
  const [shipmentCount, setShipmentCount] = useState(quotation.estimated_shipments || 1)

  const pursuitCostPerShipment = calculatePursuitCostPerShipment(
    quotation.total_pursuit_cost || 0,
    splitByShipments ? shipmentCount : 1
  )

  const revenuePerPJO = (quotation.total_revenue || 0) / (splitByShipments ? shipmentCount : 1)
  const costPerPJO = (quotation.total_cost || 0) / (splitByShipments ? shipmentCount : 1)

  async function handleConvert() {
    setIsLoading(true)
    try {
      const result = await convertToPJO(quotation.id, {
        splitByShipments,
        shipmentCount: splitByShipments ? shipmentCount : 1,
      })
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        const pjoCount = result.data?.pjo_ids.length || 1
        toast({ 
          title: 'Success', 
          description: `Created ${pjoCount} PJO${pjoCount > 1 ? 's' : ''}` 
        })
        onOpenChange(false)
        // Navigate to first PJO or PJO list
        if (result.data?.pjo_ids.length === 1) {
          router.push(`/proforma-jo/${result.data.pjo_ids[0]}`)
        } else {
          router.push('/proforma-jo')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to PJO</DialogTitle>
          <DialogDescription>
            Create PJO(s) from {quotation.quotation_number}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Split by Shipments</Label>
              <p className="text-sm text-muted-foreground">
                Create separate PJO for each shipment
              </p>
            </div>
            <Switch
              checked={splitByShipments}
              onCheckedChange={setSplitByShipments}
            />
          </div>

          {splitByShipments && (
            <div className="space-y-2">
              <Label htmlFor="shipmentCount">Number of Shipments</Label>
              <Input
                id="shipmentCount"
                type="number"
                min={1}
                max={100}
                value={shipmentCount}
                onChange={(e) => setShipmentCount(parseInt(e.target.value) || 1)}
              />
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium">Preview</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">PJOs to create:</span>
              <span className="font-medium">{splitByShipments ? shipmentCount : 1}</span>
              
              <span className="text-muted-foreground">Revenue per PJO:</span>
              <span className="font-medium">{formatIDR(revenuePerPJO)}</span>
              
              <span className="text-muted-foreground">Cost per PJO:</span>
              <span className="font-medium">{formatIDR(costPerPJO)}</span>
              
              <span className="text-muted-foreground">Pursuit cost allocation:</span>
              <span className="font-medium">{formatIDR(pursuitCostPerShipment)}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Revenue and cost items will be copied and split proportionally. 
            Classification and engineering status will be inherited (read-only on PJO).
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading ? 'Converting...' : `Create ${splitByShipments ? shipmentCount : 1} PJO${splitByShipments && shipmentCount > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
