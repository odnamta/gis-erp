'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { JobOrderWithRelations, PJORevenueItem, PJOCostItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ManagedSelect } from '@/components/ui/managed-select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { JOStatusBadge } from '@/components/ui/jo-status-badge'
import { formatIDR, formatDate, formatDateTime, COST_CATEGORY_LABELS } from '@/lib/pjo-utils'
import { markCompleted, submitToFinance, getJORevenueItems, getJOCostItems, updateJOCategory, requestJORevision } from '@/app/(main)/job-orders/actions'
import { getJobOverheadBreakdown, getJobProfitability } from '@/app/(main)/job-orders/overhead-actions'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Send, ArrowLeft, Loader2, Receipt, AlertTriangle, RotateCcw, Clock } from 'lucide-react'
import { AttachmentsSection } from '@/components/attachments'
import { InvoiceTermsSection } from './invoice-terms-section'
import { SuratJalanSection } from '@/components/surat-jalan/surat-jalan-section'
import { BeritaAcaraSection } from '@/components/berita-acara/berita-acara-section'
import { BKKSection } from '@/components/bkk/bkk-section'
import { ProfitabilitySection } from './profitability-section'
import { JobCustomsSection } from '@/components/customs-fees/job-customs-section'
import { PDFButtons } from '@/components/pdf/pdf-buttons'
import { TaxProfitSection } from '@/components/shared/tax-profit-section'
import { getBKKsByJobOrder } from '@/app/(main)/job-orders/bkk-actions'
import { getDPInvoicesForPJO } from '@/app/(main)/invoices/actions'
import type { BKKWithRelations, InvoiceWithRelations } from '@/types'
import type { JobOverheadAllocationWithCategory } from '@/types/overhead'
import { Info, ExternalLink } from 'lucide-react'

// JO Category definitions
const JO_CATEGORIES: Record<string, string> = {
  heavy_haul: 'Heavy Haul',
  general_cargo: 'General Cargo',
  project_cargo: 'Project Cargo',
  breakbulk: 'Breakbulk',
  container: 'Container',
  special: 'Special',
}

const JO_CATEGORY_COLORS: Record<string, string> = {
  heavy_haul: 'bg-red-100 text-red-800 border-red-200',
  general_cargo: 'bg-blue-100 text-blue-800 border-blue-200',
  project_cargo: 'bg-purple-100 text-purple-800 border-purple-200',
  breakbulk: 'bg-orange-100 text-orange-800 border-orange-200',
  container: 'bg-green-100 text-green-800 border-green-200',
  special: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

// Roles allowed for revision and budget warnings
const PRIVILEGED_ROLES = ['finance_manager', 'administration', 'owner', 'director']

interface JODetailViewProps {
  jobOrder: JobOrderWithRelations
  userId?: string
  userRole?: string
}

export function JODetailView({ jobOrder, userId, userRole }: JODetailViewProps) {
  const isOps = userRole === 'ops'
  const isPrivileged = PRIVILEGED_ROLES.includes(userRole || '')
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [revenueItems, setRevenueItems] = useState<PJORevenueItem[]>([])
  const [costItems, setCostItems] = useState<PJOCostItem[]>([])
  const [bkks, setBkks] = useState<BKKWithRelations[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [dpInvoices, setDpInvoices] = useState<InvoiceWithRelations[]>([])
  const [overheadBreakdown, setOverheadBreakdown] = useState<JobOverheadAllocationWithCategory[]>([])
  const [profitabilityData, setProfitabilityData] = useState<{
    totalOverhead: number;
    netProfit: number;
    netMargin: number;
  } | null>(null)

  // Feature 1: JO Category state
  const joAny = jobOrder as any
  const [currentCategory, setCurrentCategory] = useState<string>(joAny.jo_category || '')
  const [categoryLoading, setCategoryLoading] = useState(false)

  // Feature 2: Revision dialog state
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [revisionLoading, setRevisionLoading] = useState(false)

  const pjo = jobOrder.proforma_job_orders
  const profit = (jobOrder.final_revenue ?? jobOrder.amount ?? 0) - (jobOrder.final_cost ?? 0)
  const margin = jobOrder.final_revenue && jobOrder.final_revenue > 0
    ? (profit / jobOrder.final_revenue) * 100
    : 0

  useEffect(() => {
    async function loadItems() {
      if (!pjo?.id) {
        setItemsLoading(false)
        return
      }
      setItemsLoading(true)
      try {
        const [revenue, cost, bkkData, overheadData, profitData] = await Promise.all([
          getJORevenueItems(pjo.id),
          getJOCostItems(pjo.id),
          getBKKsByJobOrder(jobOrder.id),
          getJobOverheadBreakdown(jobOrder.id),
          getJobProfitability(jobOrder.id),
        ])
        setRevenueItems(revenue as PJORevenueItem[])
        setCostItems(cost as PJOCostItem[])
        setBkks(bkkData)
        setOverheadBreakdown(overheadData.allocations || [])
        if (profitData.data) {
          setProfitabilityData({
            totalOverhead: profitData.data.totalOverhead,
            netProfit: profitData.data.netProfit,
            netMargin: profitData.data.netMargin,
          })
        }
      } finally {
        setItemsLoading(false)
      }
    }
    loadItems()

    // Load DP invoices if JO has a linked PJO
    async function loadDPInvoices() {
      if (!jobOrder.pjo_id || isOps) return
      const result = await getDPInvoicesForPJO(jobOrder.pjo_id)
      if (result.success) {
        // Only show non-cancelled DP invoices
        setDpInvoices(result.data.filter(inv => inv.status !== 'cancelled'))
      }
    }
    loadDPInvoices()
  }, [pjo?.id, jobOrder.id, jobOrder.pjo_id, isOps])

  async function handleMarkCompleted() {
    setIsLoading(true)
    try {
      const result = await markCompleted(jobOrder.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Job Order marked as completed' })
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmitToFinance() {
    setIsLoading(true)
    try {
      const result = await submitToFinance(jobOrder.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Job Order submitted to finance' })
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCategoryChange(value: string) {
    setCategoryLoading(true)
    try {
      const result = await updateJOCategory(jobOrder.id, value)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        setCurrentCategory(value)
        toast({ title: 'Success', description: 'Kategori JO berhasil diperbarui' })
      }
    } finally {
      setCategoryLoading(false)
    }
  }

  async function handleRequestRevision() {
    if (!revisionNotes.trim()) {
      toast({ title: 'Error', description: 'Alasan revisi wajib diisi', variant: 'destructive' })
      return
    }
    setRevisionLoading(true)
    try {
      const result = await requestJORevision(jobOrder.id, revisionNotes)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Permintaan revisi berhasil dikirim' })
        setRevisionDialogOpen(false)
        setRevisionNotes('')
        router.refresh()
      }
    } finally {
      setRevisionLoading(false)
    }
  }

  // Feature 3: Budget allocation warning check
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const joCreatedAt = jobOrder.created_at ? new Date(jobOrder.created_at) : null
  const isOlderThan6Months = joCreatedAt ? joCreatedAt < sixMonthsAgo : false
  const hasUnusedBudget = costItems.some(
    (item) => item.actual_amount === 0 || item.actual_amount === null || item.actual_amount === undefined
  )
  const showBudgetWarning = isPrivileged && isOlderThan6Months && hasUnusedBudget && !itemsLoading

  return (
    <div className="space-y-6">
      {/* Feature 2: Revision Banner */}
      {joAny.revision_notes && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <RotateCcw className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <p className="font-medium">JO ini sedang dalam revisi.</p>
            <p>Alasan: {joAny.revision_notes}</p>
            {joAny.revision_requested_at && (
              <p className="text-xs text-yellow-600 mt-1">
                Diminta pada: {formatDateTime(joAny.revision_requested_at)}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <h1 className="text-2xl font-bold">{jobOrder.jo_number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <JOStatusBadge status={jobOrder.status} />
            {jobOrder.converted_from_pjo_at && (
              <span className="text-sm text-muted-foreground">
                Created {formatDate(jobOrder.converted_from_pjo_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <PDFButtons
            documentType="job-order"
            documentId={jobOrder.id}
            documentNumber={jobOrder.jo_number}
          />
          {(jobOrder.status === 'active' || jobOrder.status === 'in_progress') && (
            <Button onClick={handleMarkCompleted} disabled={isLoading}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Completed
            </Button>
          )}
          {jobOrder.status === 'completed' && (
            <>
              <Button onClick={handleSubmitToFinance} disabled={isLoading}>
                <Send className="mr-2 h-4 w-4" />
                Submit to Finance
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/invoices/new?joId=${jobOrder.id}`}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Create Invoice
                </Link>
              </Button>
            </>
          )}
          {jobOrder.status === 'submitted_to_finance' && (
            <Button asChild>
              <Link href={`/invoices/new?joId=${jobOrder.id}`}>
                <Receipt className="mr-2 h-4 w-4" />
                Create Invoice
              </Link>
            </Button>
          )}
          {/* Feature 2: Minta Revisi button */}
          {isPrivileged && ['submitted_to_finance', 'invoiced', 'completed'].includes(jobOrder.status) && (
            <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-50">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Minta Revisi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Minta Revisi Job Order</DialogTitle>
                  <DialogDescription>
                    JO akan dikembalikan ke status &quot;In Progress&quot; agar biaya dapat diedit kembali. Mohon isi alasan revisi.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-sm font-medium">Alasan Revisi *</Label>
                    <Textarea
                      placeholder="Jelaskan alasan mengapa JO perlu direvisi..."
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      className="mt-2"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRevisionDialogOpen(false)} disabled={revisionLoading}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleRequestRevision}
                    disabled={revisionLoading || !revisionNotes.trim()}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {revisionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Kirim Permintaan Revisi
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Source PJO */}
      {pjo && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-400">Source PJO</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/proforma-jo/${pjo.id}`} className="text-blue-600 hover:underline font-medium">
              {pjo.pjo_number}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Customer</Label>
            <p className="font-medium">
              {jobOrder.customers ? (
                <Link href={`/customers/${jobOrder.customers.id}`} className="hover:underline">
                  {jobOrder.customers.name}
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Project</Label>
            <p className="font-medium">
              {jobOrder.projects ? (
                <Link href={`/projects/${jobOrder.projects.id}`} className="hover:underline">
                  {jobOrder.projects.name}
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="font-medium">{jobOrder.description || pjo?.commodity || '-'}</p>
          </div>
          {/* Feature 1: Kategori JO */}
          <div>
            <Label className="text-muted-foreground">Kategori JO</Label>
            <div className="flex items-center gap-2 mt-1">
              {currentCategory && (
                <Badge className={JO_CATEGORY_COLORS[currentCategory] || ''}>
                  {JO_CATEGORIES[currentCategory] || currentCategory}
                </Badge>
              )}
              <ManagedSelect
                category="jo_category"
                value={currentCategory}
                onValueChange={handleCategoryChange}
                placeholder="Pilih kategori"
                canManage={true}
                disabled={categoryLoading}
                className="w-[180px] h-8 text-sm"
              />
              {categoryLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          {pjo?.quantity && (
            <div>
              <Label className="text-muted-foreground">Quantity</Label>
              <p className="font-medium">{pjo.quantity} {pjo.quantity_unit || ''}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logistics (from PJO) */}
      {pjo && (
        <Card>
          <CardHeader>
            <CardTitle>Logistics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Point of Loading (POL)</Label>
              <p className="font-medium">{pjo.pol || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Point of Destination (POD)</Label>
              <p className="font-medium">{pjo.pod || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">ETD</Label>
              <p className="font-medium">
                {pjo.etd ? formatDate(pjo.etd as string) : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">ETA</Label>
              <p className="font-medium">
                {pjo.eta ? formatDate(pjo.eta as string) : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Carrier Type</Label>
              <p className="font-medium">{pjo.carrier_type || '-'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financials — hidden from ops role */}
      {!isOps && (
        <Card>
          <CardHeader>
            <CardTitle>Final Financials</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-muted-foreground">Final Revenue</Label>
              <p className="text-lg font-semibold">{formatIDR(jobOrder.final_revenue ?? jobOrder.amount ?? 0)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Final Cost</Label>
              <p className="text-lg font-semibold">{jobOrder.final_cost ? formatIDR(jobOrder.final_cost) : '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Final Profit</Label>
              <p className={`text-lg font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {jobOrder.final_cost ? formatIDR(profit) : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Final Margin</Label>
              <p className={`text-lg font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {jobOrder.final_cost ? `${margin.toFixed(1)}%` : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profitability Analysis with Overhead — hidden from ops role */}
      {!isOps && (
        <ProfitabilitySection
          joId={jobOrder.id}
          revenue={jobOrder.final_revenue ?? jobOrder.amount ?? 0}
          directCosts={jobOrder.final_cost ?? 0}
          totalOverhead={profitabilityData?.totalOverhead ?? 0}
          netProfit={profitabilityData?.netProfit ?? profit}
          netMargin={profitabilityData?.netMargin ?? margin}
          overheadBreakdown={overheadBreakdown}
          onRecalculated={() => router.refresh()}
        />
      )}

      {/* Tax & Net Profit — hidden from ops role */}
      {!isOps && (
        <TaxProfitSection
          totalRevenue={jobOrder.final_revenue ?? jobOrder.amount ?? 0}
          totalCosts={jobOrder.final_cost ?? 0}
          grossProfit={profit}
          grossMargin={margin}
        />
      )}

      {/* DP Invoice Info Banner — show when JO has linked DP invoices, hidden from ops */}
      {!isOps && dpInvoices.length > 0 && (
        <Alert className="border-blue-300 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <p className="font-medium">Invoice DP sudah dibuat dari PJO:</p>
              {dpInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {inv.invoice_number}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="font-semibold">{formatIDR(inv.total_amount ?? 0)}</span>
                </div>
              ))}
              <p className="text-sm">
                Total DP: {formatIDR(dpInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0))} — Akan dikurangkan dari invoice final.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Invoice Terms - Show when JO is submitted to finance or later, hidden from ops */}
      {!isOps && ['submitted_to_finance', 'invoiced', 'closed'].includes(jobOrder.status) && (
        <InvoiceTermsSection
          joId={jobOrder.id}
          joStatus={jobOrder.status}
          revenue={jobOrder.final_revenue ?? jobOrder.amount ?? 0}
          invoiceTerms={jobOrder.invoice_terms}
          totalInvoiced={jobOrder.total_invoiced ?? 0}
          hasSuratJalan={jobOrder.has_surat_jalan ?? false}
          hasBeritaAcara={jobOrder.has_berita_acara ?? false}
          pjoRevenueTotal={revenueItems.reduce((sum, item) => sum + (item.subtotal || 0), 0)}
        />
      )}

      {/* Invoice vs JO Value Alert — show when invoiced/closed and amounts differ by >1% */}
      {!isOps && ['invoiced', 'closed'].includes(jobOrder.status) && (jobOrder.total_invoiced ?? 0) > 0 && (() => {
        const totalInvoiced = jobOrder.total_invoiced ?? 0
        const joRevenueWithVAT = (jobOrder.final_revenue ?? jobOrder.amount ?? 0) * 1.11
        const difference = totalInvoiced - joRevenueWithVAT
        const percentDiff = joRevenueWithVAT > 0 ? Math.abs(difference) / joRevenueWithVAT : 0
        if (percentDiff <= 0.01) return null
        return (
          <Alert className="border-yellow-300 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Total invoice ({formatIDR(totalInvoiced)}) berbeda dengan nilai JO + PPN 11% ({formatIDR(joRevenueWithVAT)}). Selisih: {formatIDR(Math.abs(difference))}
            </AlertDescription>
          </Alert>
        )
      })()}

      {/* Revenue Breakdown — hidden from ops role */}
      {!isOps && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : revenueItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No revenue items found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatIDR(item.unit_price ?? 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatIDR(item.subtotal ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={4}>Total Revenue</TableCell>
                    <TableCell className="text-right">{formatIDR(jobOrder.final_revenue ?? 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown (Actual)</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Feature 3: Budget Allocation Warning */}
          {showBudgetWarning && (
            <Alert className="border-amber-300 bg-amber-50 mb-4">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Ada anggaran biaya yang dialokasikan lebih dari 6 bulan yang lalu dan belum terpakai. Mohon review.
              </AlertDescription>
            </Alert>
          )}
          {itemsLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : costItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No cost items found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">BKK Disbursed</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costItems.map((item) => {
                  const variance = (item.actual_amount ?? 0) - item.estimated_amount
                  // Calculate BKK disbursements for this cost item
                  const itemBKKs = bkks.filter(b => b.pjo_cost_item_id === item.id)
                  const disbursed = itemBKKs
                    .filter(b => b.status && ['released', 'settled'].includes(b.status))
                    .reduce((sum, b) => sum + (b.amount_requested || 0), 0)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{COST_CATEGORY_LABELS[item.category] || item.category}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {(item as PJOCostItem & { vendor_name?: string | null }).vendor_name || '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatIDR(item.estimated_amount ?? 0)}</TableCell>
                      <TableCell className="text-right text-blue-600">
                        {disbursed > 0 ? formatIDR(disbursed) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{item.actual_amount != null ? formatIDR(item.actual_amount ?? 0) : '-'}</TableCell>
                      <TableCell className={`text-right ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}`}>
                        {item.actual_amount != null ? formatIDR(variance) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={4}>Total Cost</TableCell>
                  <TableCell className="text-right text-blue-600">
                    {formatIDR(bkks.filter(b => b.status && ['released', 'settled'].includes(b.status)).reduce((sum, b) => sum + (b.amount_requested || 0), 0))}
                  </TableCell>
                  <TableCell className="text-right">{formatIDR(jobOrder.final_cost ?? 0)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Created from PJO</Label>
            <p className="font-medium">
              {jobOrder.converted_from_pjo_at
                ? formatDateTime(jobOrder.converted_from_pjo_at)
                : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Completed</Label>
            <p className="font-medium">
              {jobOrder.completed_at
                ? formatDateTime(jobOrder.completed_at)
                : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Submitted to Finance</Label>
            <p className="font-medium">
              {jobOrder.submitted_to_finance_at
                ? formatDateTime(jobOrder.submitted_to_finance_at)
                : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Customs Costs */}
      <JobCustomsSection jobOrderId={jobOrder.id} />

      {/* Notes */}
      {pjo?.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{pjo.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Surat Jalan Section */}
      <SuratJalanSection joId={jobOrder.id} />

      {/* Berita Acara Section - Show if required or has existing BAs */}
      <BeritaAcaraSection
        joId={jobOrder.id}
        requiresBeritaAcara={jobOrder.requires_berita_acara ?? false}
      />

      {/* BKK (Cash Disbursement) Section */}
      <BKKSection
        jobOrderId={jobOrder.id}
        bkks={bkks}
        userRole={userRole || 'ops'}
        canRequest={['active', 'in_progress'].includes(jobOrder.status)}
      />

      {/* Attachments */}
      <AttachmentsSection
        entityType="jo"
        entityId={jobOrder.id}
        title="Attachments"
      />
    </div>
  )
}
