'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { Customer } from '@/types'
import { DatePicker } from '@/components/forms/date-picker'

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  established_date: z.string().optional(),
  payment_terms_days: z.string().optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerFormProps {
  customer?: Customer | null
  onSubmit: (data: CustomerFormData) => Promise<void>
  isLoading: boolean
}

export function CustomerForm({ customer, onSubmit, isLoading }: CustomerFormProps) {
  const existingDate = (customer as any)?.established_date
    ? new Date((customer as any).established_date)
    : undefined
  const [establishedDate, setEstablishedDate] = useState<Date | undefined>(existingDate)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || '',
      established_date: (customer as any)?.established_date || '',
      payment_terms_days: (customer as Record<string, unknown>)?.payment_terms_days
        ? String((customer as Record<string, unknown>).payment_terms_days)
        : '',
    },
  })

  const handleDateSelect = (date: Date | undefined) => {
    setEstablishedDate(date)
    if (date) {
      // Format as YYYY-MM-DD for database storage
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      setValue('established_date', `${year}-${month}-${day}`)
    } else {
      setValue('established_date', '')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Customer name"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="customer@example.com"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="+62 xxx xxxx xxxx"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          {...register('address')}
          placeholder="Customer address"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_terms_days">Termin Pembayaran (hari)</Label>
        <Input
          id="payment_terms_days"
          type="number"
          {...register('payment_terms_days')}
          placeholder="Kosongkan untuk default sistem (30 hari)"
          disabled={isLoading}
          min={1}
          max={365}
        />
        <p className="text-xs text-muted-foreground">
          Jika diisi, due date invoice akan dihitung dari termin ini
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tanggal Berdiri</Label>
        <DatePicker
          date={establishedDate}
          onSelect={handleDateSelect}
          placeholder="Pilih tanggal berdiri"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : customer ? (
          'Update Customer'
        ) : (
          'Add Customer'
        )}
      </Button>
    </form>
  )
}
