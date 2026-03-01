'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import {
  getBGsForInvoice,
  createBG,
  updateBGStatus,
  BilyetGiro,
  BGStatus,
  CreateBGInput,
} from '@/lib/bg-actions'
import { Plus, Loader2, CreditCard, AlertTriangle, Check, X } from 'lucide-react'

const bgFormSchema = z.object({
  bg_number: z.string().min(1, 'Nomor BG wajib diisi'),
  bank_name: z.string().min(1, 'Nama bank wajib diisi'),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  issue_date: z.string().min(1, 'Tanggal terbit wajib diisi'),
  maturity_date: z.string().min(1, 'Tanggal jatuh tempo wajib diisi'),
  notes: z.string().optional(),
})

type BGFormValues = z.infer<typeof bgFormSchema>

interface BGSectionProps {
  invoiceId: string
  invoiceNumber: string
}

const STATUS_BADGE_CONFIG: Record<BGStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  cleared: { label: 'Cair', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  bounced: { label: 'Tolak', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  cancelled: { label: 'Batal', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100' },
}

function isApproachingMaturity(maturityDate: string): boolean {
  const maturity = new Date(maturityDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  maturity.setHours(0, 0, 0, 0)
  const diffDays = (maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 7
}

function isPastMaturity(maturityDate: string): boolean {
  const maturity = new Date(maturityDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  maturity.setHours(0, 0, 0, 0)
  return maturity < today
}

export function BGSection({ invoiceId, invoiceNumber }: BGSectionProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [bgs, setBgs] = useState<BilyetGiro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const form = useForm<BGFormValues>({
    resolver: zodResolver(bgFormSchema),
    defaultValues: {
      bg_number: '',
      bank_name: '',
      amount: 0,
      issue_date: new Date().toISOString().split('T')[0],
      maturity_date: '',
      notes: '',
    },
  })

  const loadBGs = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getBGsForInvoice(invoiceId)
      setBgs(data)
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    loadBGs()
  }, [loadBGs])

  const handleCreateBG = async (values: BGFormValues) => {
    setIsSubmitting(true)
    try {
      const input: CreateBGInput = {
        invoice_id: invoiceId,
        bg_number: values.bg_number,
        bank_name: values.bank_name,
        amount: values.amount,
        issue_date: values.issue_date,
        maturity_date: values.maturity_date,
        notes: values.notes,
      }
      const result = await createBG(input)
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Berhasil', description: 'Bilyet Giro berhasil ditambahkan' })
      form.reset()
      setIsDialogOpen(false)
      await loadBGs()
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (bgId: string, status: BGStatus) => {
    setActionLoadingId(bgId)
    try {
      const result = await updateBGStatus(bgId, status)
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }
      const statusLabel = status === 'cleared' ? 'dicairkan' : status === 'bounced' ? 'ditolak' : 'dibatalkan'
      toast({ title: 'Berhasil', description: `BG berhasil ${statusLabel}` })
      await loadBGs()
      router.refresh()
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Bilyet Giro
          </CardTitle>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah BG
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : bgs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">
            Belum ada Bilyet Giro untuk invoice ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. BG</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Tgl Terbit</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bgs.map((bg) => {
                const approaching = bg.status === 'pending' && isApproachingMaturity(bg.maturity_date)
                const pastDue = bg.status === 'pending' && isPastMaturity(bg.maturity_date)
                const config = STATUS_BADGE_CONFIG[bg.status as BGStatus] || STATUS_BADGE_CONFIG.pending

                return (
                  <TableRow key={bg.id}>
                    <TableCell className="font-medium">{bg.bg_number}</TableCell>
                    <TableCell>{bg.bank_name}</TableCell>
                    <TableCell className="text-right">{formatIDR(bg.amount)}</TableCell>
                    <TableCell>{formatDate(bg.issue_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {formatDate(bg.maturity_date)}
                        {approaching && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs ml-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Segera
                          </Badge>
                        )}
                        {pastDue && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100 text-xs ml-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Lewat
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.className}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {bg.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(bg.id, 'cleared')}
                            disabled={actionLoadingId === bg.id}
                            title="Cairkan"
                          >
                            {actionLoadingId === bg.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            <span className="ml-1 hidden sm:inline">Cairkan</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(bg.id, 'bounced')}
                            disabled={actionLoadingId === bg.id}
                            title="Tolak"
                            className="text-red-600 hover:text-red-700"
                          >
                            {actionLoadingId === bg.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            <span className="ml-1 hidden sm:inline">Tolak</span>
                          </Button>
                        </div>
                      )}
                      {bg.status === 'cleared' && bg.cleared_date && (
                        <span className="text-xs text-muted-foreground">
                          Cair: {formatDate(bg.cleared_date)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add BG Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Bilyet Giro</DialogTitle>
            <DialogDescription>
              Invoice: {invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleCreateBG)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bg_number">Nomor BG *</Label>
              <Input
                id="bg_number"
                placeholder="Masukkan nomor BG"
                {...form.register('bg_number')}
              />
              {form.formState.errors.bg_number && (
                <p className="text-sm text-destructive">{form.formState.errors.bg_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank *</Label>
              <Input
                id="bank_name"
                placeholder="e.g., BCA, Mandiri, BNI"
                {...form.register('bank_name')}
              />
              {form.formState.errors.bank_name && (
                <p className="text-sm text-destructive">{form.formState.errors.bank_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Nominal *</Label>
              <Input
                id="amount"
                type="number"
                step="1"
                min="1"
                placeholder="Masukkan nominal"
                {...form.register('amount', { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">Tanggal Terbit *</Label>
                <Input
                  id="issue_date"
                  type="date"
                  {...form.register('issue_date')}
                />
                {form.formState.errors.issue_date && (
                  <p className="text-sm text-destructive">{form.formState.errors.issue_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maturity_date">Jatuh Tempo *</Label>
                <Input
                  id="maturity_date"
                  type="date"
                  {...form.register('maturity_date')}
                />
                {form.formState.errors.maturity_date && (
                  <p className="text-sm text-destructive">{form.formState.errors.maturity_date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan (opsional)"
                {...form.register('notes')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan BG
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
