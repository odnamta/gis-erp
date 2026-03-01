'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, CreditCard } from 'lucide-react'
import { createDisbursement } from '../actions'

const formSchema = z.object({
  jo_id: z.string().min(1, 'Job Order wajib dipilih'),
  vendor_id: z.string().optional(),
  purpose: z.string().min(1, 'Keperluan wajib diisi'),
  amount_requested: z.number().positive('Jumlah harus lebih dari 0'),
  budget_category: z.string().optional(),
  budget_amount: z.number().positive().optional(),
  release_method: z.enum(['cash', 'transfer', 'check']).optional(),
  release_reference: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Vendor {
  id: string
  vendor_name: string
  vendor_code: string | null
  bank_name: string | null
  bank_account: string | null
  bank_account_name: string | null
}

interface JobOrder {
  id: string
  jo_number: string
}

interface NewDisbursementFormProps {
  vendors: Vendor[]
  jobOrders: JobOrder[]
  userId: string
}

export function NewDisbursementForm({ vendors, jobOrders, userId }: NewDisbursementFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jo_id: '',
      purpose: '',
      amount_requested: 0,
      budget_category: '',
      release_method: 'transfer',
      release_reference: '',
      notes: '',
    },
  })

  const vendorId = form.watch('vendor_id')
  const selectedVendor = vendors.find(v => v.id === vendorId)

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createDisbursement({
        jo_id: values.jo_id,
        purpose: values.purpose,
        amount_requested: values.amount_requested,
        budget_category: values.budget_category || undefined,
        budget_amount: values.budget_amount || undefined,
        vendor_id: values.vendor_id || undefined,
        release_method: values.release_method || undefined,
        release_reference: values.release_reference || undefined,
        notes: values.notes || undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Disbursement berhasil dibuat')
      router.push(`/disbursements/${result.data?.id}`)
    } catch (error) {
      toast.error('Gagal membuat disbursement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">BKK Baru</h1>
          <p className="text-muted-foreground">Buat bukti kas keluar baru</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Dasar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="jo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Order *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih job order" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jobOrders.map((jo) => (
                            <SelectItem key={jo.id} value={jo.id}>
                              {jo.jo_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        BKK harus terhubung dengan job order
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih vendor (opsional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.vendor_name} {vendor.vendor_code && `(${vendor.vendor_code})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keperluan *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Masukkan keperluan disbursement..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori Anggaran</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: operasional, sewa alat, BBM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Amount & Payment */}
            <Card>
              <CardHeader>
                <CardTitle>Jumlah & Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount_requested"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah Diminta (IDR) *</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="1000" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budget_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anggaran (IDR)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="1000" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="release_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metode Pembayaran</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih metode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="transfer">Transfer Bank</SelectItem>
                          <SelectItem value="cash">Tunai</SelectItem>
                          <SelectItem value="check">Cek/Giro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="release_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referensi Pembayaran</FormLabel>
                      <FormControl>
                        <Input placeholder="No. transfer / referensi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vendor Bank Details */}
                {selectedVendor?.bank_account && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm text-blue-700 dark:text-blue-300">
                        Rekening Bank Vendor
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama Bank</p>
                        <p className="font-medium">{selectedVendor.bank_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">No. Rekening</p>
                        <p className="font-medium font-mono">{selectedVendor.bank_account}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Atas Nama</p>
                        <p className="font-medium">{selectedVendor.bank_account_name || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Catatan tambahan..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Disbursement
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
