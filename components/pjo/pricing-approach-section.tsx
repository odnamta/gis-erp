'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PricingApproach, PRICING_APPROACH_LABELS } from '@/types/market-classification'
import { DollarSign } from 'lucide-react'

interface PricingApproachSectionProps {
  pricingApproach: PricingApproach | null
  pricingNotes: string
  marketType: 'simple' | 'complex' | null
  onPricingApproachChange: (value: PricingApproach) => void
  onPricingNotesChange: (value: string) => void
  disabled?: boolean
}

const pricingOptions: { value: PricingApproach; label: string; description: string }[] = [
  { value: 'standard', label: PRICING_APPROACH_LABELS.standard, description: 'Standard market rates' },
  { value: 'premium', label: PRICING_APPROACH_LABELS.premium, description: 'Higher rates for complex projects' },
  { value: 'negotiated', label: PRICING_APPROACH_LABELS.negotiated, description: 'Custom negotiated pricing' },
  { value: 'cost_plus', label: PRICING_APPROACH_LABELS.cost_plus, description: 'Cost plus margin' },
]

export function PricingApproachSection({
  pricingApproach,
  pricingNotes,
  marketType,
  onPricingApproachChange,
  onPricingNotesChange,
  disabled = false,
}: PricingApproachSectionProps) {
  const isComplex = marketType === 'complex'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing Approach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pricing_approach">Pricing Strategy</Label>
            <Select
              value={pricingApproach || ''}
              onValueChange={(value) => onPricingApproachChange(value as PricingApproach)}
              disabled={disabled}
            >
              <SelectTrigger id="pricing_approach">
                <SelectValue placeholder="Select pricing approach" />
              </SelectTrigger>
              <SelectContent>
                {pricingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isComplex && !pricingApproach && (
              <p className="text-sm text-orange-600">
                Premium pricing is recommended for complex projects
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricing_notes">Pricing Notes</Label>
          <Textarea
            id="pricing_notes"
            value={pricingNotes}
            onChange={(e) => onPricingNotesChange(e.target.value)}
            placeholder="Add notes about pricing decisions, special considerations, or negotiation details..."
            rows={3}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  )
}