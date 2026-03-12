'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { PEBFormData, ExportType, TransportMode } from '@/types/peb'
import { CustomsOffice } from '@/types/pib'
import { createPEBDocument, updatePEBDocument } from '@/lib/peb-actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PEBFormProps {
  initialData?: Partial<PEBFormData> & { id?: string }
  exportTypes: ExportType[]
  customsOffices: CustomsOffice[]
  jobOrders?: { id: string; jo_number: string }[]
  customers?: { id: string; name: string }[]
}

export function PEBForm({
  initialData,
  exportTypes,
  customsOffices,
  jobOrders = [],
  customers = [],
}: PEBFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<PEBFormData>>({
    exporter_name: initialData?.exporter_name || '',
    exporter_npwp: initialData?.exporter_npwp || '',
    exporter_address: initialData?.exporter_address || '',
    consignee_name: initialData?.consignee_name || '',
    consignee_country: initialData?.consignee_country || '',
    consignee_address: initialData?.consignee_address || '',
    export_type_id: initialData?.export_type_id || '',
    customs_office_id: initialData?.customs_office_id || '',
    transport_mode: initialData?.transport_mode || 'sea',
    vessel_name: initialData?.vessel_name || '',
    voyage_number: initialData?.voyage_number || '',
    bill_of_lading: initialData?.bill_of_lading || '',
    awb_number: initialData?.awb_number || '',
    port_of_loading: initialData?.port_of_loading || '',
    port_of_discharge: initialData?.port_of_discharge || '',
    final_destination: initialData?.final_destination || '',
    etd_date: initialData?.etd_date || '',
    total_packages: initialData?.total_packages || undefined,
    package_type: initialData?.package_type || '',
    gross_weight_kg: initialData?.gross_weight_kg || undefined,
    currency: initialData?.currency || 'USD',
    fob_value: initialData?.fob_value || 0,
    job_order_id: initialData?.job_order_id || '',
    customer_id: initialData?.customer_id || '',
    notes: initialData?.notes || '',
  })

  const handleChange = (field: keyof PEBFormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData: PEBFormData = {
        exporter_name: formData.exporter_name || '',
        export_type_id: formData.export_type_id || '',
        customs_office_id: formData.customs_office_id || '',
        transport_mode: (formData.transport_mode || 'sea') as TransportMode,
        currency: formData.currency || 'USD',
        fob_value: formData.fob_value || 0,
        exporter_npwp: formData.exporter_npwp,
        exporter_address: formData.exporter_address,
        consignee_name: formData.consignee_name,
        consignee_country: formData.consignee_country,
        consignee_address: formData.consignee_address,
        vessel_name: formData.vessel_name,
        voyage_number: formData.voyage_number,
        bill_of_lading: formData.bill_of_lading,
        awb_number: formData.awb_number,
        port_of_loading: formData.port_of_loading,
        port_of_discharge: formData.port_of_discharge,
        final_destination: formData.final_destination,
        etd_date: formData.etd_date,
        total_packages: formData.total_packages,
        package_type: formData.package_type,
        gross_weight_kg: formData.gross_weight_kg,
        job_order_id: formData.job_order_id || undefined,
        customer_id: formData.customer_id || undefined,
        notes: formData.notes,
      }

      let result
      if (initialData?.id) {
        result = await updatePEBDocument(initialData.id, submitData)
      } else {
        result = await createPEBDocument(submitData)
      }

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(initialData?.id ? 'PEB updated successfully' : 'PEB created successfully')
      router.push(`/customs/export/${result.data?.id}`)
    } catch (_error) {
      toast.error('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Exporter Details */}
      <Card>
        <CardHeader>
          <CardTitle>Exporter Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exporter_name">Exporter Name *</Label>
            <Input
              id="exporter_name"
              value={formData.exporter_name}
              onChange={(e) => handleChange('exporter_name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exporter_npwp">NPWP</Label>
            <Input
              id="exporter_npwp"
              value={formData.exporter_npwp}
              onChange={(e) => handleChange('exporter_npwp', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="exporter_address">Address</Label>
            <Textarea
              id="exporter_address"
              value={formData.exporter_address}
              onChange={(e) => handleChange('exporter_address', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Consignee Details */}
      <Card>
        <CardHeader>
          <CardTitle>Consignee Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="consignee_name">Consignee Name</Label>
            <Input
              id="consignee_name"
              value={formData.consignee_name}
              onChange={(e) => handleChange('consignee_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consignee_country">Country</Label>
            <Input
              id="consignee_country"
              value={formData.consignee_country}
              onChange={(e) => handleChange('consignee_country', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="consignee_address">Address</Label>
            <Textarea
              id="consignee_address"
              value={formData.consignee_address}
              onChange={(e) => handleChange('consignee_address', e.target.value)}
              rows={2}
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
            <Label htmlFor="export_type_id">Export Type *</Label>
            <Select
              value={formData.export_type_id}
              onValueChange={(value) => handleChange('export_type_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select export type" />
              </SelectTrigger>
              <SelectContent>
                {exportTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.type_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customs_office_id">Customs Office *</Label>
            <Select
              value={formData.customs_office_id}
              onValueChange={(value) => handleChange('customs_office_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customs office" />
              </SelectTrigger>
              <SelectContent>
                {customsOffices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.office_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transport Details */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="transport_mode">Transport Mode *</Label>
            <Select
              value={formData.transport_mode}
              onValueChange={(value) => handleChange('transport_mode', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sea">Sea</SelectItem>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vessel_name">Vessel Name</Label>
            <Input
              id="vessel_name"
              value={formData.vessel_name}
              onChange={(e) => handleChange('vessel_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voyage_number">Voyage Number</Label>
            <Input
              id="voyage_number"
              value={formData.voyage_number}
              onChange={(e) => handleChange('voyage_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bill_of_lading">Bill of Lading</Label>
            <Input
              id="bill_of_lading"
              value={formData.bill_of_lading}
              onChange={(e) => handleChange('bill_of_lading', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awb_number">AWB Number</Label>
            <Input
              id="awb_number"
              value={formData.awb_number}
              onChange={(e) => handleChange('awb_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etd_date">ETD Date</Label>
            <Input
              id="etd_date"
              type="date"
              value={formData.etd_date}
              onChange={(e) => handleChange('etd_date', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Port Details */}
      <Card>
        <CardHeader>
          <CardTitle>Port Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="port_of_loading">Port of Loading</Label>
            <Input
              id="port_of_loading"
              value={formData.port_of_loading}
              onChange={(e) => handleChange('port_of_loading', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port_of_discharge">Port of Discharge</Label>
            <Input
              id="port_of_discharge"
              value={formData.port_of_discharge}
              onChange={(e) => handleChange('port_of_discharge', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="final_destination">Final Destination</Label>
            <Input
              id="final_destination"
              value={formData.final_destination}
              onChange={(e) => handleChange('final_destination', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cargo Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Cargo Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="total_packages">Total Packages</Label>
            <Input
              id="total_packages"
              type="number"
              value={formData.total_packages || ''}
              onChange={(e) => handleChange('total_packages', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package_type">Package Type</Label>
            <Input
              id="package_type"
              value={formData.package_type}
              onChange={(e) => handleChange('package_type', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gross_weight_kg">Gross Weight (kg)</Label>
            <Input
              id="gross_weight_kg"
              type="number"
              step="0.001"
              value={formData.gross_weight_kg || ''}
              onChange={(e) => handleChange('gross_weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Value */}
      <Card>
        <CardHeader>
          <CardTitle>Value</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleChange('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="IDR">IDR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fob_value">FOB Value</Label>
            <Input
              id="fob_value"
              type="number"
              step="0.01"
              value={formData.fob_value || ''}
              onChange={(e) => handleChange('fob_value', e.target.value ? parseFloat(e.target.value) : 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job_order_id">Job Order</Label>
            <Select
              value={formData.job_order_id || 'none'}
              onValueChange={(value) => handleChange('job_order_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
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
              value={formData.customer_id || 'none'}
              onValueChange={(value) => handleChange('customer_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
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
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes..."
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData?.id ? 'Update PEB' : 'Create PEB'}
        </Button>
      </div>
    </form>
  )
}
