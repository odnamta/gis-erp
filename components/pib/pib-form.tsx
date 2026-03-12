'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  PIBDocument,
  PIBFormData,
  CustomsOffice,
  ImportType,
  TransportMode,
} from '@/types/pib'
import { createPIBDocument, updatePIBDocument } from '@/lib/pib-actions'
import { calculateCIFValue, formatCurrency } from '@/lib/pib-utils'
import { useToast } from '@/hooks/use-toast'

const pibSchema = z.object({
  importer_name: z.string().min(1, 'Importer name is required'),
  importer_npwp: z.string().optional(),
  importer_address: z.string().optional(),
  supplier_name: z.string().optional(),
  supplier_country: z.string().optional(),
  import_type_id: z.string().min(1, 'Import type is required'),
  customs_office_id: z.string().min(1, 'Customs office is required'),
  transport_mode: z.enum(['sea', 'air', 'land']),
  vessel_name: z.string().optional(),
  voyage_number: z.string().optional(),
  bill_of_lading: z.string().optional(),
  awb_number: z.string().optional(),
  port_of_loading: z.string().optional(),
  port_of_discharge: z.string().optional(),
  eta_date: z.string().optional(),
  total_packages: z.number().optional(),
  package_type: z.string().optional(),
  gross_weight_kg: z.number().optional(),
  currency: z.string().min(1, 'Currency is required'),
  fob_value: z.number().min(0, 'FOB value must be positive'),
  freight_value: z.number().optional(),
  insurance_value: z.number().optional(),
  exchange_rate: z.number().optional(),
  job_order_id: z.string().optional(),
  customer_id: z.string().optional(),
  notes: z.string().optional(),
})

type PIBFormValues = z.infer<typeof pibSchema>

interface PIBFormProps {
  pib?: PIBDocument | null
  customsOffices: CustomsOffice[]
  importTypes: ImportType[]
  jobOrders?: { id: string; jo_number: string }[]
  customers?: { id: string; name: string }[]
  mode: 'create' | 'edit'
}

const CURRENCIES = ['USD', 'EUR', 'SGD', 'JPY', 'CNY', 'IDR']
const PACKAGE_TYPES = ['Carton', 'Pallet', 'Container', 'Crate', 'Drum', 'Bag', 'Bundle', 'Other']

export function PIBForm({
  pib,
  customsOffices,
  importTypes,
  jobOrders = [],
  customers = [],
  mode,
}: PIBFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [cifValue, setCifValue] = useState(0)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PIBFormValues>({
    resolver: zodResolver(pibSchema),
    defaultValues: {
      importer_name: pib?.importer_name || '',
      importer_npwp: pib?.importer_npwp || '',
      importer_address: pib?.importer_address || '',
      supplier_name: pib?.supplier_name || '',
      supplier_country: pib?.supplier_country || '',
      import_type_id: pib?.import_type_id || '',
      customs_office_id: pib?.customs_office_id || '',
      transport_mode: pib?.transport_mode || 'sea',
      vessel_name: pib?.vessel_name || '',
      voyage_number: pib?.voyage_number || '',
      bill_of_lading: pib?.bill_of_lading || '',
      awb_number: pib?.awb_number || '',
      port_of_loading: pib?.port_of_loading || '',
      port_of_discharge: pib?.port_of_discharge || '',
      eta_date: pib?.eta_date || '',
      total_packages: pib?.total_packages || undefined,
      package_type: pib?.package_type || '',
      gross_weight_kg: pib?.gross_weight_kg || undefined,
      currency: pib?.currency || 'USD',
      fob_value: pib?.fob_value || 0,
      freight_value: pib?.freight_value || 0,
      insurance_value: pib?.insurance_value || 0,
      exchange_rate: pib?.exchange_rate || undefined,
      job_order_id: pib?.job_order_id || '',
      customer_id: pib?.customer_id || '',
      notes: pib?.notes || '',
    },
  })

  const transportMode = watch('transport_mode')
  const fobValue = watch('fob_value')
  const freightValue = watch('freight_value')
  const insuranceValue = watch('insurance_value')
  const currency = watch('currency')

  // Calculate CIF value when values change
  useEffect(() => {
    const cif = calculateCIFValue(
      fobValue || 0,
      freightValue || 0,
      insuranceValue || 0
    )
    setCifValue(cif)
  }, [fobValue, freightValue, insuranceValue])

  async function onSubmit(data: PIBFormValues) {
    setIsLoading(true)
    try {
      const formData: PIBFormData = {
        ...data,
        transport_mode: data.transport_mode as TransportMode,
        job_order_id: data.job_order_id || undefined,
        customer_id: data.customer_id || undefined,
      }

      if (mode === 'create') {
        const result = await createPIBDocument(formData)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Success', description: 'PIB document created' })
          router.push(`/customs/import/${result.data?.id}`)
        }
      } else if (pib) {
        const result = await updatePIBDocument(pib.id, formData)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Success', description: 'PIB document updated' })
          router.push(`/customs/import/${pib.id}`)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Importer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Importer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="importer_name">Importer Name *</Label>
            <Input
              id="importer_name"
              {...register('importer_name')}
              disabled={isLoading}
            />
            {errors.importer_name && (
              <p className="text-sm text-destructive">{errors.importer_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="importer_npwp">NPWP</Label>
            <Input
              id="importer_npwp"
              {...register('importer_npwp')}
              placeholder="XX.XXX.XXX.X-XXX.XXX"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="importer_address">Address</Label>
            <Textarea
              id="importer_address"
              {...register('importer_address')}
              rows={2}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Supplier Information */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplier_name">Supplier Name</Label>
            <Input
              id="supplier_name"
              {...register('supplier_name')}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier_country">Country of Origin</Label>
            <Input
              id="supplier_country"
              {...register('supplier_country')}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="import_type_id">Import Type *</Label>
            <Select
              value={watch('import_type_id')}
              onValueChange={(v) => setValue('import_type_id', v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select import type" />
              </SelectTrigger>
              <SelectContent>
                {importTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.type_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.import_type_id && (
              <p className="text-sm text-destructive">{errors.import_type_id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customs_office_id">Customs Office *</Label>
            <Select
              value={watch('customs_office_id')}
              onValueChange={(v) => setValue('customs_office_id', v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customs office" />
              </SelectTrigger>
              <SelectContent>
                {customsOffices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.office_name} ({office.office_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customs_office_id && (
              <p className="text-sm text-destructive">{errors.customs_office_id.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transport Details */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="transport_mode">Transport Mode *</Label>
            <Select
              value={transportMode}
              onValueChange={(v) => setValue('transport_mode', v as TransportMode)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sea">Sea Freight</SelectItem>
                <SelectItem value="air">Air Freight</SelectItem>
                <SelectItem value="land">Land Transport</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {transportMode === 'sea' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="vessel_name">Vessel Name</Label>
                <Input
                  id="vessel_name"
                  {...register('vessel_name')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voyage_number">Voyage Number</Label>
                <Input
                  id="voyage_number"
                  {...register('voyage_number')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill_of_lading">Bill of Lading</Label>
                <Input
                  id="bill_of_lading"
                  {...register('bill_of_lading')}
                  disabled={isLoading}
                />
              </div>
            </>
          )}
          {transportMode === 'air' && (
            <div className="space-y-2">
              <Label htmlFor="awb_number">AWB Number</Label>
              <Input
                id="awb_number"
                {...register('awb_number')}
                disabled={isLoading}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="port_of_loading">Port of Loading</Label>
            <Input
              id="port_of_loading"
              {...register('port_of_loading')}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port_of_discharge">Port of Discharge</Label>
            <Input
              id="port_of_discharge"
              {...register('port_of_discharge')}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eta_date">ETA Date</Label>
            <Input
              id="eta_date"
              type="date"
              {...register('eta_date')}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cargo Details */}
      <Card>
        <CardHeader>
          <CardTitle>Cargo Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="total_packages">Total Packages</Label>
            <Input
              id="total_packages"
              type="number"
              {...register('total_packages', { valueAsNumber: true })}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package_type">Package Type</Label>
            <Select
              value={watch('package_type') || ''}
              onValueChange={(v) => setValue('package_type', v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gross_weight_kg">Gross Weight (kg)</Label>
            <Input
              id="gross_weight_kg"
              type="number"
              step="0.01"
              {...register('gross_weight_kg', { valueAsNumber: true })}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Values */}
      <Card>
        <CardHeader>
          <CardTitle>Values</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={currency}
                onValueChange={(v) => setValue('currency', v)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fob_value">FOB Value *</Label>
              <Input
                id="fob_value"
                type="number"
                step="0.01"
                {...register('fob_value', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.fob_value && (
                <p className="text-sm text-destructive">{errors.fob_value.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="freight_value">Freight</Label>
              <Input
                id="freight_value"
                type="number"
                step="0.01"
                {...register('freight_value', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurance_value">Insurance</Label>
              <Input
                id="insurance_value"
                type="number"
                step="0.01"
                {...register('insurance_value', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exchange_rate">Exchange Rate (to IDR)</Label>
              <Input
                id="exchange_rate"
                type="number"
                step="0.01"
                {...register('exchange_rate', { valueAsNumber: true })}
                placeholder="e.g., 15500"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>CIF Value (Calculated)</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-lg font-semibold">
                {formatCurrency(cifValue, currency)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linking */}
      <Card>
        <CardHeader>
          <CardTitle>Linking (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job_order_id">Job Order</Label>
            <Select
              value={watch('job_order_id') || '__none__'}
              onValueChange={(v) => setValue('job_order_id', v === '__none__' ? '' : v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {jobOrders.map((jo) => (
                  <SelectItem key={jo.id} value={jo.id}>
                    {jo.jo_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer</Label>
            <Select
              value={watch('customer_id') || '__none__'}
              onValueChange={(v) => setValue('customer_id', v === '__none__' ? '' : v)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register('notes')}
            placeholder="Additional notes..."
            rows={3}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : mode === 'edit' ? (
            'Update PIB'
          ) : (
            'Create PIB'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
