'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatIDR } from '@/lib/pjo-utils'
import { PAYMENT_METHODS, PaymentFormData, PaymentMethod } from '@/types/payments'
import { isOverpayment } from '@/lib/payment-utils'
import { Loader2 } from 'lucide-react'

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['transfer', 'cash', 'check', 'giro'] as const, {
    message: 'Please select a payment method',
  }),
  reference_number: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  invoiceNumber: string
  customerName: string
  remainingBalance: number
  onSubmit: (data: PaymentFormData) => Promise<void>
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  customerName,
  remainingBalance,
  onSubmit,
}: RecordPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOverpaymentWarning, setShowOverpaymentWarning] = useState(false)
  const [pendingData, setPendingData] = useState<PaymentFormData | null>(null)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: undefined,
      reference_number: '',
      bank_name: '',
      bank_account: '',
      notes: '',
    },
  })

  const watchedMethod = form.watch('payment_method')
  const showBankFields = watchedMethod === 'transfer'

  const handlePayFull = () => {
    form.setValue('amount', remainingBalance)
  }

  const handleSubmit = async (values: PaymentFormValues) => {
    const formData: PaymentFormData = {
      invoice_id: invoiceId,
      amount: values.amount,
      payment_date: values.payment_date,
      payment_method: values.payment_method as PaymentMethod,
      reference_number: values.reference_number || undefined,
      bank_name: values.bank_name || undefined,
      bank_account: values.bank_account || undefined,
      notes: values.notes || undefined,
    }

    // Check for overpayment
    if (isOverpayment(values.amount, remainingBalance)) {
      setPendingData(formData)
      setShowOverpaymentWarning(true)
      return
    }

    await submitPayment(formData)
  }

  const submitPayment = async (data: PaymentFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOverpaymentConfirm = async () => {
    setShowOverpaymentWarning(false)
    if (pendingData) {
      await submitPayment(pendingData)
      setPendingData(null)
    }
  }

  const handleOverpaymentCancel = () => {
    setShowOverpaymentWarning(false)
    setPendingData(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Invoice: {invoiceNumber}<br />
              Customer: {customerName}<br />
              Remaining Balance: <span className="font-semibold">{formatIDR(remainingBalance)}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePayFull}
                  disabled={remainingBalance <= 0}
                >
                  Pay Full
                </Button>
              </div>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter amount"
                {...form.register('amount', { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                {...form.register('payment_date')}
              />
              {form.formState.errors.payment_date && (
                <p className="text-sm text-destructive">{form.formState.errors.payment_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={form.watch('payment_method')}
                onValueChange={(value) => form.setValue('payment_method', value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.payment_method && (
                <p className="text-sm text-destructive">{form.formState.errors.payment_method.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                placeholder="Transfer ref / Check number"
                {...form.register('reference_number')}
              />
            </div>

            {showBankFields && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    placeholder="e.g., BCA, Mandiri"
                    {...form.register('bank_name')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_account">Bank Account</Label>
                  <Input
                    id="bank_account"
                    placeholder="Account number"
                    {...form.register('bank_account')}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes (optional)"
                {...form.register('notes')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showOverpaymentWarning} onOpenChange={setShowOverpaymentWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overpayment Warning</AlertDialogTitle>
            <AlertDialogDescription>
              This payment exceeds the remaining balance of {formatIDR(remainingBalance)}.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleOverpaymentCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverpaymentConfirm}>
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
