'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ManagedSelect } from '@/components/ui/managed-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, FileQuestion, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import { ProformaJobOrder, PJORevenueItem, PJOCostItem } from '@/types'
import { ProjectWithCustomer } from '@/components/projects/project-table'
import { createPJO, updatePJO } from '@/app/(main)/proforma-jo/actions'
import type { PJOFormData } from '@/app/(main)/proforma-jo/actions'
import { useToast } from '@/hooks/use-toast'
import { debugLog, debugError } from '@/lib/utils/debug-logger'
// formatIDR is used in FinancialSummary component
import { PlacesAutocomplete, LocationData } from '@/components/ui/places-autocomplete'
import { RevenueItemsTable, RevenueItemRow } from './revenue-items-table'
import { CostItemsTable, CostItemRow, CostCategory } from './cost-items-table'
import { FinancialSummary } from './financial-summary'
import { CargoSpecificationsSection } from './cargo-specifications-section'
import { RouteCharacteristicsSection } from './route-characteristics-section'
import { MarketClassificationDisplay } from './market-classification-display'
import { PricingApproachSection } from './pricing-approach-section'
import { useMarketClassification } from '@/hooks/use-market-classification'
import { CargoSpecifications, RouteCharacteristics, TerrainType, PricingApproach, parseComplexityFactors } from '@/types/market-classification'

const revenueItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unit_price: z.number().min(1, 'Unit price must be greater than 0'),
  subtotal: z.number(),
  source_type: z.enum(['quotation', 'contract', 'manual']).optional(),
  source_id: z.string().optional(),
})

const costItemSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  estimated_amount: z.number().min(1, 'Amount must be greater than 0'),
  status: z.enum(['estimated', 'confirmed', 'exceeded', 'under_budget']),
  actual_amount: z.number().optional(),
  estimated_by: z.string().optional(),
  vendor_id: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
})

export const pjoSchema = z.object({
  project_id: z.string().min(1, 'Please select a project'),
  jo_date: z.string().min(1, 'Date is required'),
  commodity: z.string().optional(),
  quantity: z.number().optional(),
  quantity_unit: z.string().optional(),
  pol: z.string().optional(),
  pod: z.string().optional(),
  pol_place_id: z.string().optional(),
  pol_lat: z.number().optional(),
  pol_lng: z.number().optional(),
  pod_place_id: z.string().optional(),
  pod_lat: z.number().optional(),
  pod_lng: z.number().optional(),
  etd: z.string().optional(),
  eta: z.string().optional(),
  carrier_type: z.string().optional(),
  total_revenue: z.number().min(0, 'Revenue must be non-negative'),
  total_expenses: z.number().min(0, 'Expenses must be non-negative'),
  notes: z.string().optional(),
  revenue_items: z.array(revenueItemSchema).min(1, 'At least one revenue item is required'),
  cost_items: z.array(costItemSchema).min(1, 'At least one cost item is required'),
}).refine((data) => {
  if (data.etd && data.eta) return new Date(data.eta) >= new Date(data.etd)
  return true
}, { message: 'ETA must be on or after ETD', path: ['eta'] })

export type PJOFormValues = z.infer<typeof pjoSchema>


interface PJOFormProps {
  projects: ProjectWithCustomer[]
  pjo?: ProformaJobOrder | null
  existingRevenueItems?: PJORevenueItem[]
  existingCostItems?: PJOCostItem[]
  preselectedProjectId?: string
  mode: 'create' | 'edit'
  // If PJO was created from a quotation, classification is inherited and read-only
  isFromQuotation?: boolean
  quotationNumber?: string
}

function toCostItemRow(item: PJOCostItem): CostItemRow {
  return {
    id: item.id,
    category: item.category as CostCategory,
    description: item.description,
    estimated_amount: item.estimated_amount,
    actual_amount: item.actual_amount ?? undefined,
    status: item.status as 'estimated' | 'confirmed' | 'exceeded' | 'under_budget',
    estimated_by: item.estimated_by ?? undefined,
    vendor_id: item.vendor_id ?? null,
  }
}

function toRevenueItemRow(item: PJORevenueItem): RevenueItemRow {
  return {
    id: item.id, description: item.description, quantity: item.quantity,
    unit: item.unit, unit_price: item.unit_price, subtotal: item.subtotal ?? 0,
    source_type: item.source_type as 'quotation' | 'contract' | 'manual' | undefined,
    source_id: item.source_id ?? undefined,
  }
}

export function PJOForm({ projects, pjo, existingRevenueItems = [], existingCostItems = [], preselectedProjectId, mode, isFromQuotation = false, quotationNumber }: PJOFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const initialRevenueItems: RevenueItemRow[] = existingRevenueItems.map(toRevenueItemRow)
  const initialCostItems: CostItemRow[] = existingCostItems.map(toCostItemRow)
  const [revenueItems, setRevenueItems] = useState<RevenueItemRow[]>(initialRevenueItems)
  const [costItems, setCostItems] = useState<CostItemRow[]>(initialCostItems)
  const [revenueItemErrors, setRevenueItemErrors] = useState<Record<number, { description?: string; unit_price?: string }>>({})
  const [costItemErrors, setCostItemErrors] = useState<Record<number, { category?: string; description?: string; estimated_amount?: string }>>({})
  const today = new Date().toISOString().split('T')[0]
  const calculatedTotalRevenue = revenueItems.reduce((sum, item) => sum + item.subtotal, 0)
  const calculatedTotalCost = costItems.reduce((sum, item) => sum + item.estimated_amount, 0)

  // Market classification state
  const [cargoSpecs, setCargoSpecs] = useState<CargoSpecifications>({
    cargo_weight_kg: pjo?.cargo_weight_kg ?? null,
    cargo_length_m: pjo?.cargo_length_m ?? null,
    cargo_width_m: pjo?.cargo_width_m ?? null,
    cargo_height_m: pjo?.cargo_height_m ?? null,
    cargo_value: pjo?.cargo_value ?? null,
    duration_days: pjo?.duration_days ?? null,
  })
  const [routeChars, setRouteChars] = useState<RouteCharacteristics>({
    is_new_route: pjo?.is_new_route ?? false,
    terrain_type: (pjo?.terrain_type as TerrainType) ?? null,
    requires_special_permit: pjo?.requires_special_permit ?? false,
    is_hazardous: pjo?.is_hazardous ?? false,
  })
  const [pricingNotes, setPricingNotes] = useState(pjo?.pricing_notes ?? '')

  // Use market classification hook
  const {
    classification,
    isCalculating,
    pricingApproach,
    setPricingApproach,
    recalculate,
  } = useMarketClassification({
    cargoSpecs,
    routeChars,
    initialClassification: pjo?.market_type ? {
      market_type: pjo.market_type as 'simple' | 'complex',
      complexity_score: pjo.complexity_score ?? 0,
      complexity_factors: parseComplexityFactors(pjo.complexity_factors),
      requires_engineering: (pjo.complexity_score ?? 0) >= 20,
    } : null,
    initialPricingApproach: (pjo?.pricing_approach as PricingApproach) ?? null,
  })


  const { register, handleSubmit, setValue, watch, trigger, formState: { errors } } = useForm<PJOFormValues>({
    resolver: zodResolver(pjoSchema),
    defaultValues: {
      project_id: pjo?.project_id || preselectedProjectId || '',
      jo_date: pjo?.jo_date || today,
      commodity: pjo?.commodity || '',
      quantity: pjo?.quantity || 0,
      quantity_unit: pjo?.quantity_unit || '',
      pol: pjo?.pol || '',
      pod: pjo?.pod || '',
      pol_place_id: pjo?.pol_place_id || '',
      pol_lat: pjo?.pol_lat || undefined,
      pol_lng: pjo?.pol_lng || undefined,
      pod_place_id: pjo?.pod_place_id || '',
      pod_lat: pjo?.pod_lat || undefined,
      pod_lng: pjo?.pod_lng || undefined,
      etd: pjo?.etd || '',
      eta: pjo?.eta || '',
      carrier_type: pjo?.carrier_type || '',
      total_revenue: pjo?.total_revenue || 0,
      total_expenses: pjo?.total_expenses || 0,
      notes: pjo?.notes || '',
      revenue_items: initialRevenueItems,
      cost_items: initialCostItems,
    },
  })

  const selectedProjectId = watch('project_id')
  const selectedQuantityUnit = watch('quantity_unit')
  const selectedCarrierType = watch('carrier_type')
  const polValue = watch('pol') || ''
  const podValue = watch('pod') || ''
  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  // Contract value for selected project
  const [contractValue, setContractValue] = useState<number | null>(null)
  useEffect(() => {
    if (!selectedProjectId) {
      setContractValue(null)
      return
    }
    const supabase = createClient()
    ;(supabase.from('projects') as any)
      .select('contract_value')
      .eq('id', selectedProjectId)
      .single()
      .then(({ data }: { data: { contract_value: number | null } | null }) => {
        setContractValue(data?.contract_value ?? null)
      })
  }, [selectedProjectId])


  const handleRevenueItemsChange = useCallback((items: RevenueItemRow[]) => {
    setRevenueItems(items)
    setValue('total_revenue', items.reduce((sum, item) => sum + item.subtotal, 0))
    setValue('revenue_items', items)
    setRevenueItemErrors({})
  }, [setValue])

  const handleCostItemsChange = useCallback((items: CostItemRow[]) => {
    setCostItems(items)
    setValue('total_expenses', items.reduce((sum, item) => sum + item.estimated_amount, 0))
    setValue('cost_items', items)
    setCostItemErrors({})
  }, [setValue])

  const validateRevenueItems = useCallback((): boolean => {
    const newErrors: Record<number, { description?: string; unit_price?: string }> = {}
    let hasErrors = false
    if (revenueItems.length === 0) {
      toast({ title: 'Error', description: 'At least one revenue item is required', variant: 'destructive' })
      return false
    }
    revenueItems.forEach((item, index) => {
      const itemErrors: { description?: string; unit_price?: string } = {}
      if (!item.description.trim()) { itemErrors.description = 'Description is required'; hasErrors = true }
      if (item.unit_price <= 0) { itemErrors.unit_price = 'Unit price must be greater than 0'; hasErrors = true }
      if (Object.keys(itemErrors).length > 0) newErrors[index] = itemErrors
    })
    setRevenueItemErrors(newErrors)
    return !hasErrors
  }, [revenueItems, toast])

  const validateCostItems = useCallback((): boolean => {
    const newErrors: Record<number, { category?: string; description?: string; estimated_amount?: string }> = {}
    let hasErrors = false
    if (costItems.length === 0) {
      toast({ title: 'Error', description: 'At least one cost item is required', variant: 'destructive' })
      return false
    }
    costItems.forEach((item, index) => {
      const itemErrors: { category?: string; description?: string; estimated_amount?: string } = {}
      if (!item.category) { itemErrors.category = 'Category is required'; hasErrors = true }
      if (!item.description.trim()) { itemErrors.description = 'Description is required'; hasErrors = true }
      if (item.estimated_amount <= 0) { itemErrors.estimated_amount = 'Amount must be greater than 0'; hasErrors = true }
      if (Object.keys(itemErrors).length > 0) newErrors[index] = itemErrors
    })
    setCostItemErrors(newErrors)
    return !hasErrors
  }, [costItems, toast])

  function handlePOLChange(value: string, locationData?: LocationData) {
    setValue('pol', value)
    if (locationData) {
      setValue('pol_place_id', locationData.placeId)
      setValue('pol_lat', locationData.lat)
      setValue('pol_lng', locationData.lng)
    } else {
      setValue('pol_place_id', undefined)
      setValue('pol_lat', undefined)
      setValue('pol_lng', undefined)
    }
  }

  function handlePODChange(value: string, locationData?: LocationData) {
    setValue('pod', value)
    if (locationData) {
      setValue('pod_place_id', locationData.placeId)
      setValue('pod_lat', locationData.lat)
      setValue('pod_lng', locationData.lng)
    } else {
      setValue('pod_place_id', undefined)
      setValue('pod_lat', undefined)
      setValue('pod_lng', undefined)
    }
  }

  async function onSubmit(data: Omit<PJOFormValues, 'revenue_items' | 'cost_items'>) {
    // Debug logging: Log when submission is attempted with form state
    debugLog('PJO Form', 'Submission attempted', { 
      isLoading, 
      revenueItemsCount: revenueItems.length,
      costItemsCount: costItems.length 
    })

    // Validation checks - return early if invalid (no loading state change needed)
    if (!validateRevenueItems()) {
      debugLog('PJO Form', 'Revenue items validation failed')
      return
    }
    if (!validateCostItems()) {
      debugLog('PJO Form', 'Cost items validation failed')
      return
    }

    setIsLoading(true)
    debugLog('PJO Form', 'Loading state set to true')

    try {
      const formData: PJOFormData = {
        ...data,
        quantity: data.quantity ?? 0,
        total_revenue: calculatedTotalRevenue,
        total_expenses: calculatedTotalCost,
        revenue_items: revenueItems.map(item => ({
          id: item.id, description: item.description, quantity: item.quantity,
          unit: item.unit, unit_price: item.unit_price,
          source_type: item.source_type || 'manual', source_id: item.source_id,
        })),
        cost_items: costItems.map(item => ({
          id: item.id, category: item.category, description: item.description,
          estimated_amount: item.estimated_amount,
          vendor_id: item.vendor_id || null,
        })),
        // Market classification fields
        cargo_weight_kg: cargoSpecs.cargo_weight_kg,
        cargo_length_m: cargoSpecs.cargo_length_m,
        cargo_width_m: cargoSpecs.cargo_width_m,
        cargo_height_m: cargoSpecs.cargo_height_m,
        cargo_value: cargoSpecs.cargo_value,
        duration_days: cargoSpecs.duration_days,
        is_new_route: routeChars.is_new_route,
        terrain_type: routeChars.terrain_type,
        requires_special_permit: routeChars.requires_special_permit,
        is_hazardous: routeChars.is_hazardous,
        market_type: classification?.market_type ?? null,
        complexity_score: classification?.complexity_score ?? null,
        complexity_factors: classification?.complexity_factors ?? null,
        pricing_approach: pricingApproach,
        pricing_notes: pricingNotes || null,
      }

      if (mode === 'create') {
        const result = await createPJO(formData)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Success', description: 'PJO created successfully' })
          router.push(`/proforma-jo/${result.id}`)
        }
      } else if (pjo) {
        const result = await updatePJO(pjo.id, formData)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Success', description: 'PJO updated successfully' })
          router.push(`/proforma-jo/${pjo.id}`)
        }
      }
    } catch (error) {
      // Catch unexpected errors that might occur during submission
      debugError('PJO Form', 'Unexpected error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      })
    } finally {
      // CRITICAL: Always reset loading state regardless of success/failure/error
      setIsLoading(false)
      debugLog('PJO Form', 'Loading state reset to false')
    }
  }


  return (
    <form onSubmit={handleSubmit(onSubmit as (data: PJOFormValues) => void)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jo_date">Date *</Label>
            <Input id="jo_date" type="date" {...register('jo_date')} disabled={isLoading} />
            {errors.jo_date && <p className="text-sm text-destructive">{errors.jo_date.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="project_id">Project *</Label>
            <Select value={selectedProjectId} onValueChange={(v) => setValue('project_id', v)} disabled={isLoading || mode === 'edit'}>
              <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.customers?.name})</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.project_id && <p className="text-sm text-destructive">{errors.project_id.message}</p>}
            {selectedProject && <p className="text-sm text-muted-foreground">Customer: {selectedProject.customers?.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="commodity">Commodity</Label>
            <Input id="commodity" {...register('commodity')} placeholder="What is being transported" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" step="0.01" {...register('quantity', { valueAsNumber: true })} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity_unit">Unit</Label>
              <ManagedSelect
                category="quantity_unit"
                value={selectedQuantityUnit}
                onValueChange={(v) => setValue('quantity_unit', v)}
                placeholder="Satuan"
                canManage={true}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Logistics</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pol">Point of Loading (POL)</Label>
            <PlacesAutocomplete id="pol" value={polValue} onChange={handlePOLChange} placeholder="Origin location" disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pod">Point of Destination (POD)</Label>
            <PlacesAutocomplete id="pod" value={podValue} onChange={handlePODChange} placeholder="Delivery location" disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etd">ETD (Estimated Departure)</Label>
            <Input id="etd" type="date" {...register('etd', { onChange: () => trigger('eta') })} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eta">ETA (Estimated Arrival)</Label>
            <Input id="eta" type="date" {...register('eta')} disabled={isLoading} />
            {errors.eta && <p className="text-sm text-destructive">{errors.eta.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="carrier_type">Carrier Type</Label>
            <ManagedSelect
              category="carrier_type"
              value={selectedCarrierType}
              onValueChange={(v) => setValue('carrier_type', v)}
              placeholder="Pilih tipe kendaraan"
              canManage={true}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Market Classification Section */}
      {isFromQuotation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-800">
              <FileQuestion className="h-5 w-5" />
              <span className="font-medium">Classification inherited from Quotation {quotationNumber}</span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded ml-auto">Read-only</span>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              Cargo specifications, route characteristics, and market classification were determined during the quotation phase and cannot be modified.
            </p>
          </CardContent>
        </Card>
      )}

      <CargoSpecificationsSection
        values={cargoSpecs}
        onChange={setCargoSpecs}
        disabled={isLoading || isFromQuotation}
      />

      <RouteCharacteristicsSection
        values={routeChars}
        onChange={setRouteChars}
        disabled={isLoading || isFromQuotation}
      />

      <MarketClassificationDisplay
        classification={classification}
        isCalculating={isCalculating}
        onRecalculate={recalculate}
        disabled={isLoading || isFromQuotation}
      />

      <PricingApproachSection
        pricingApproach={pricingApproach}
        pricingNotes={pricingNotes}
        marketType={classification?.market_type ?? null}
        onPricingApproachChange={setPricingApproach}
        onPricingNotesChange={setPricingNotes}
        disabled={isLoading || isFromQuotation}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Items</CardTitle>
            {contractValue != null && contractValue > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700 border border-blue-200">
                <Info className="h-3.5 w-3.5" />
                <span>Nilai Kontrak: {formatCurrency(contractValue)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <RevenueItemsTable items={revenueItems} onChange={handleRevenueItemsChange} errors={revenueItemErrors} disabled={isLoading} />
          {errors.revenue_items && <p className="text-sm text-destructive mt-2">{errors.revenue_items.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cost Items (Budget)</CardTitle></CardHeader>
        <CardContent>
          <CostItemsTable items={costItems} onChange={handleCostItemsChange} errors={costItemErrors} disabled={isLoading} />
          {errors.cost_items && <p className="text-sm text-destructive mt-2">{errors.cost_items.message}</p>}
        </CardContent>
      </Card>

      <FinancialSummary totalRevenue={calculatedTotalRevenue} totalEstimatedCost={calculatedTotalCost} />

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea {...register('notes')} placeholder="Additional notes..." rows={4} disabled={isLoading} />
        </CardContent>
      </Card>

      {/* Validation Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-md bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Please fix the following errors:</span>
          </div>
          <ul className="mt-2 list-disc list-inside text-sm text-destructive">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error?.message || `${field} is invalid`}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={isLoading}
          className={cn(
            "min-w-[140px]",
            isLoading && "cursor-not-allowed"
          )}
        >
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : mode === 'edit' ? 'Update PJO' : 'Create PJO'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
      </div>
    </form>
  )
}
