'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import { InvoiceTerm, PresetType, parseInvoiceTerms } from '@/types'
import {
  getPresetTerms,
  validateTermsTotal,
  calculateTermsPercentageTotal,
  hasAnyInvoicedTerm,
  detectPresetFromTerms,
  createEmptyTerm,
  checkRevenueDiscrepancy,
  calculateUninvoicedRevenue,
  PRESET_LABELS,
} from '@/lib/invoice-terms-utils'
import { formatIDR } from '@/lib/pjo-utils'
import { saveInvoiceTerms } from '@/app/(main)/job-orders/actions'
import { InvoiceTermForm } from './invoice-term-form'
import { InvoiceTermsTable } from './invoice-terms-table'
import { useToast } from '@/hooks/use-toast'
import { FileText, Plus, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Json } from '@/types/database'

interface InvoiceTermsSectionProps {
  joId: string
  joStatus: string
  revenue: number
  invoiceTerms: Json | null
  totalInvoiced: number
  hasSuratJalan?: boolean
  hasBeritaAcara?: boolean
  pjoRevenueTotal?: number // Total from PJO revenue items for discrepancy check
}

export function InvoiceTermsSection({
  joId,
  joStatus,
  revenue,
  invoiceTerms,
  totalInvoiced,
  hasSuratJalan = false,
  hasBeritaAcara = false,
  pjoRevenueTotal,
}: InvoiceTermsSectionProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const parsedTerms = parseInvoiceTerms(invoiceTerms)
  const [terms, setTerms] = useState<InvoiceTerm[]>(parsedTerms)
  const [preset, setPreset] = useState<PresetType>(detectPresetFromTerms(parsedTerms))
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(parsedTerms.length === 0)


  const hasInvoiced = hasAnyInvoicedTerm(terms)
  const percentageTotal = calculateTermsPercentageTotal(terms)
  const isValid = validateTermsTotal(terms)
  
  // Check for revenue discrepancy between PJO items and JO final revenue
  const revenueDiscrepancy = pjoRevenueTotal !== undefined 
    ? checkRevenueDiscrepancy(pjoRevenueTotal, revenue)
    : null
  
  // Calculate uninvoiced revenue
  const { uninvoicedAmount, uninvoicedPercent } = calculateUninvoicedRevenue(terms, revenue)

  // Sync terms when invoiceTerms prop changes
  useEffect(() => {
    const newTerms = parseInvoiceTerms(invoiceTerms)
    setTerms(newTerms)
    setPreset(detectPresetFromTerms(newTerms))
    setIsEditing(newTerms.length === 0)
  }, [invoiceTerms])

  const handlePresetChange = (value: PresetType) => {
    setPreset(value)
    if (value !== 'custom') {
      setTerms(getPresetTerms(value))
    }
  }

  const handleTermUpdate = (index: number, updatedTerm: InvoiceTerm) => {
    const newTerms = [...terms]
    newTerms[index] = updatedTerm
    setTerms(newTerms)
    setPreset('custom')
  }

  const handleTermRemove = (index: number) => {
    const newTerms = terms.filter((_, i) => i !== index)
    setTerms(newTerms)
    setPreset('custom')
  }

  const handleAddTerm = () => {
    setTerms([...terms, createEmptyTerm()])
    setPreset('custom')
  }

  const handleSave = async () => {
    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: 'Invoice terms must total exactly 100%',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await saveInvoiceTerms(joId, terms)
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Invoice terms saved successfully',
        })
        setIsEditing(false)
        router.refresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Show read-only table if terms are set and not editing
  if (terms.length > 0 && !isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Terms
          </CardTitle>
          {!hasInvoiced && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit Terms
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Revenue Discrepancy Warning */}
          {revenueDiscrepancy?.hasDiscrepancy && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Revenue Mismatch:</strong> PJO revenue items total ({formatIDR(revenueDiscrepancy.pjoRevenueTotal)}) 
                differs from JO final revenue ({formatIDR(revenueDiscrepancy.joFinalRevenue)}) by {formatIDR(Math.abs(revenueDiscrepancy.difference))} 
                ({Math.abs(revenueDiscrepancy.differencePercent).toFixed(1)}%). 
                Some revenue may not be invoiced.
              </AlertDescription>
            </Alert>
          )}

          {/* Uninvoiced Revenue Warning */}
          {hasInvoiced && uninvoicedPercent > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>Pending Invoices:</strong> {uninvoicedPercent}% of revenue ({formatIDR(uninvoicedAmount)}) 
                has not been invoiced yet. Generate remaining invoices to complete billing.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-lg font-semibold">{formatIDR(revenue)}</div>
          </div>
          <InvoiceTermsTable
            terms={terms}
            revenue={revenue}
            joId={joId}
            joStatus={joStatus}
            totalInvoiced={totalInvoiced}
            hasSuratJalan={hasSuratJalan}
            hasBeritaAcara={hasBeritaAcara}
          />
        </CardContent>
      </Card>
    )
  }


  // Show editing form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoice Terms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Revenue Display */}
        <div>
          <div className="text-sm text-muted-foreground">Total Revenue</div>
          <div className="text-lg font-semibold">{formatIDR(revenue)}</div>
        </div>

        {/* Preset Selection */}
        <div className="space-y-2">
          <Label>Payment Structure</Label>
          <Select value={preset} onValueChange={handlePresetChange} disabled={hasInvoiced}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select payment structure" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESET_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Terms Editor */}
        {(preset === 'custom' || terms.length > 0) && (
          <div className="space-y-3">
            <Label>Invoice Terms</Label>
            {terms.map((term, index) => (
              <InvoiceTermForm
                key={index}
                term={term}
                index={index}
                revenue={revenue}
                onUpdate={handleTermUpdate}
                onRemove={handleTermRemove}
                disabled={hasInvoiced}
              />
            ))}
            
            {!hasInvoiced && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTerm}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Term
              </Button>
            )}
          </div>
        )}

        {/* Validation Status */}
        {terms.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {isValid ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Total: {percentageTotal}% - Valid
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Total: {percentageTotal}% - Must equal 100%
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="flex gap-2">
              {parsedTerms.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setTerms(parsedTerms)
                    setPreset(detectPresetFromTerms(parsedTerms))
                    setIsEditing(false)
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!isValid || isSaving || hasInvoiced}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Terms
              </Button>
            </div>
          </div>
        )}

        {hasInvoiced && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invoice terms cannot be modified after invoices have been generated.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}