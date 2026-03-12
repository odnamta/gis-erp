'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PJOWithRelations, PJORevenueItem } from '@/types'
import type { PJOCostItemWithVendor } from '@/app/(main)/proforma-jo/cost-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PJOStatusBadge } from '@/components/ui/pjo-status-badge'
import { RevenueItemsSection } from './revenue-items-section'
import { CostItemsSection } from './cost-items-section'
import { CostConfirmationSection } from './cost-confirmation-section'
import { BudgetSummary } from './budget-summary'
import { ConversionStatus } from './conversion-status'
import { formatIDR, formatDate, calculateMargin, calculateRevenueTotal, calculateCostTotal, analyzeBudget, validatePositiveMargin } from '@/lib/pjo-utils'
import { submitForApproval, approvePJO, rejectPJO } from '@/app/(main)/proforma-jo/actions'
import { getRevenueItems } from '@/app/(main)/proforma-jo/revenue-actions'
import { getCostItems } from '@/app/(main)/proforma-jo/cost-actions'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Send, Check, X, DollarSign, Receipt, Loader2, ExternalLink } from 'lucide-react'
import { createDPInvoice, getDPInvoicesForPJO } from '@/app/(main)/invoices/actions'
import type { InvoiceWithRelations } from '@/types'
import { AttachmentsSection } from '@/components/attachments'
import { MarketTypeBadge } from '@/components/ui/market-type-badge'
import { MarketType, ComplexityFactor } from '@/types/market-classification'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle } from 'lucide-react'
import { FileQuestion } from 'lucide-react'
import { PDFButtons } from '@/components/pdf/pdf-buttons'
import { TaxProfitSection } from '@/components/shared/tax-profit-section'
// Engineering components
import { EngineeringStatusBanner } from '@/components/engineering/engineering-status-banner'
import { EngineeringAssessmentsSection } from '@/components/engineering/engineering-assessments-section'
import { AssignEngineeringDialog } from '@/components/engineering/assign-engineering-dialog'
import { WaiveReviewDialog } from '@/components/engineering/waive-review-dialog'
import { CompleteReviewDialog } from '@/components/engineering/complete-review-dialog'
import { CompleteAssessmentDialog } from '@/components/engineering/complete-assessment-dialog'
import { ApprovalBlockedDialog } from '@/components/engineering/approval-blocked-dialog'
import {
  getEngineeringAssessments,
  initializeEngineeringReview,
  startAssessment,
  completeAssessment,
  completeEngineeringReview,
  waiveEngineeringReview,
  cancelAssessment,
} from '@/app/(main)/proforma-jo/engineering-actions'
import { canWaiveEngineeringReview, canCompleteAssessment } from '@/lib/engineering-utils'
import { EngineeringStatus, EngineeringAssessment, AssessmentType } from '@/types/engineering'

const SERVICE_SCOPE_LABELS: Record<string, string> = {
  cargo: 'Cargo / Heavy-Haul',
  customs: 'Customs / Kepabeanan',
  agency: 'Agency / Keagenan',
  cargo_customs: 'Cargo + Customs',
  full_service: 'Full Service',
  other: 'Lainnya',
}

interface AssessmentWithUser extends EngineeringAssessment {
  assigned_user_name?: string | null
  completed_by_name?: string | null
}

interface PJODetailViewProps {
  pjo: PJOWithRelations
  canApprove?: boolean
  userRole?: string | null
  userId?: string | null
}

export function PJODetailView({ pjo, canApprove = true, userRole, userId }: PJODetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [revenueItems, setRevenueItems] = useState<PJORevenueItem[]>([])
  const [costItems, setCostItems] = useState<PJOCostItemWithVendor[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  
  // Engineering state
  const [assessments, setAssessments] = useState<AssessmentWithUser[]>([])
  const [assessmentsLoading, setAssessmentsLoading] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false)
  const [completeReviewDialogOpen, setCompleteReviewDialogOpen] = useState(false)
  const [completeAssessmentDialogOpen, setCompleteAssessmentDialogOpen] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | null>(null)
  const [approvalBlockedDialogOpen, setApprovalBlockedDialogOpen] = useState(false)

  // DP Invoice state
  const [dpDialogOpen, setDpDialogOpen] = useState(false)
  const [dpPercentage, setDpPercentage] = useState(30)
  const [dpNotes, setDpNotes] = useState('')
  const [dpLoading, setDpLoading] = useState(false)
  const [dpInvoices, setDpInvoices] = useState<InvoiceWithRelations[]>([])
  const [dpInvoicesLoading, setDpInvoicesLoading] = useState(false)

  const margin = calculateMargin(pjo.total_revenue ?? 0, pjo.total_expenses ?? 0)
  const isOps = userRole === 'ops'

  // Engineering permissions
  const requiresEngineering = pjo.requires_engineering === true
  const engineeringStatus = (pjo.engineering_status as EngineeringStatus) || 'pending'
  const canWaive = canWaiveEngineeringReview(userRole)
  const canAssign = canWaive // Same permission level
  const isEngineeringBlocking = requiresEngineering && 
    (engineeringStatus === 'pending' || engineeringStatus === 'in_progress')

  const loadItems = async () => {
    setItemsLoading(true)
    try {
      const [revenue, cost] = await Promise.all([
        getRevenueItems(pjo.id),
        getCostItems(pjo.id),
      ])
      setRevenueItems(revenue)
      setCostItems(cost)
    } finally {
      setItemsLoading(false)
    }
  }

  const loadAssessments = async () => {
    if (!requiresEngineering) return
    setAssessmentsLoading(true)
    try {
      const result = await getEngineeringAssessments(pjo.id)
      if (!result.error && result.data) {
        setAssessments(result.data.map((a: EngineeringAssessment & { 
          assigned_user?: { full_name?: string; email?: string } | null;
          completed_user?: { full_name?: string; email?: string } | null;
        }) => ({
          ...a,
          assigned_user_name: a.assigned_user?.full_name || a.assigned_user?.email || null,
          completed_by_name: a.completed_user?.full_name || a.completed_user?.email || null,
        })))
      }
    } finally {
      setAssessmentsLoading(false)
    }
  }

  const loadDPInvoices = async () => {
    if (pjo.status !== 'approved' || isOps) return
    setDpInvoicesLoading(true)
    try {
      const result = await getDPInvoicesForPJO(pjo.id)
      if (result.success) {
        setDpInvoices(result.data)
      }
    } finally {
      setDpInvoicesLoading(false)
    }
  }

  async function handleCreateDPInvoice() {
    setDpLoading(true)
    try {
      const result = await createDPInvoice(pjo.id, dpPercentage, dpNotes || undefined)
      if (result.success) {
        toast({
          title: 'Invoice DP Dibuat',
          description: `${result.data.invoice_number} berhasil dibuat`,
        })
        setDpDialogOpen(false)
        setDpPercentage(30)
        setDpNotes('')
        loadDPInvoices()
        router.refresh()
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } finally {
      setDpLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
    loadAssessments()
    loadDPInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pjo.id])

  const totalRevenue = revenueItems.length > 0 
    ? calculateRevenueTotal(revenueItems) 
    : (pjo.total_revenue ?? 0)
  const budget = analyzeBudget(costItems)
  const hasItemizedData = revenueItems.length > 0 || costItems.length > 0
  // Allow editing in draft status for anyone, AND in pending_approval for users with check/approve permissions
  // This lets finance_manager and other managers adjust items during the review process
  const isEditable = pjo.status === 'draft' ||
    (pjo.status === 'pending_approval' && ['owner', 'director', 'finance_manager', 'marketing_manager', 'operations_manager', 'administration'].includes(userRole || ''))
  const showCostConfirmation = pjo.status === 'approved' && !pjo.converted_to_jo

  async function handleSubmitForApproval() {
    // Validate line items exist
    if (revenueItems.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one revenue item', variant: 'destructive' })
      return
    }
    if (costItems.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one cost item', variant: 'destructive' })
      return
    }

    // Validate positive margin (revenue > cost)
    const totalCost = calculateCostTotal(costItems, 'estimated')
    const marginValidation = validatePositiveMargin(totalRevenue, totalCost)
    if (!marginValidation.valid) {
      toast({ title: 'Error', description: marginValidation.error, variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await submitForApproval(pjo.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'PJO submitted for approval' })
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApprove() {
    // Check if engineering is blocking approval
    if (isEngineeringBlocking) {
      setApprovalBlockedDialogOpen(true)
      return
    }

    setIsLoading(true)
    try {
      const result = await approvePJO(pjo.id)
      if (result.error) {
        // Check if blocked by engineering
        if (result.blocked) {
          setApprovalBlockedDialogOpen(true)
        } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        }
      } else {
        toast({ title: 'Success', description: 'PJO approved' })
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Engineering action handlers
  async function handleAssignEngineering(userId: string) {
    const result = await initializeEngineeringReview(pjo.id, userId)
    if (result.error) {
      return { error: result.error }
    }
    toast({ title: 'Success', description: 'Engineering review assigned' })
    router.refresh()
    loadAssessments()
    return {}
  }

  async function handleWaiveReview(reason: string) {
    const result = await waiveEngineeringReview(pjo.id, reason)
    if (result.error) {
      return { error: result.error }
    }
    toast({ title: 'Success', description: 'Engineering review waived' })
    router.refresh()
    return {}
  }

  async function handleStartAssessment(assessmentId: string) {
    const result = await startAssessment(assessmentId)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Assessment started' })
      loadAssessments()
    }
  }

  async function handleCompleteAssessment(data: {
    findings: string
    recommendations: string
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    additional_cost_estimate?: number
    cost_justification?: string
  }) {
    if (!selectedAssessmentId) return { error: 'No assessment selected' }
    const result = await completeAssessment(selectedAssessmentId, data)
    if (result.error) {
      return { error: result.error }
    }
    toast({ title: 'Success', description: 'Assessment completed' })
    loadAssessments()
    router.refresh()
    return {}
  }

  async function handleCancelAssessment(assessmentId: string) {
    const result = await cancelAssessment(assessmentId)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Assessment cancelled' })
      loadAssessments()
    }
  }

  async function handleCompleteReview(data: {
    overall_risk_level: 'low' | 'medium' | 'high' | 'critical'
    decision: 'approved' | 'approved_with_conditions' | 'not_recommended' | 'rejected'
    engineering_notes: string
    apply_additional_costs: boolean
  }) {
    const result = await completeEngineeringReview(pjo.id, data)
    if (result.error) {
      return { error: result.error }
    }
    toast({ title: 'Success', description: 'Engineering review completed' })
    router.refresh()
    return {}
  }

  function openCompleteAssessmentDialog(assessmentId: string) {
    const assessment = assessments.find(a => a.id === assessmentId)
    if (assessment) {
      setSelectedAssessmentId(assessmentId)
      setSelectedAssessmentType(assessment.assessment_type)
      setCompleteAssessmentDialogOpen(true)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      toast({ title: 'Error', description: 'Please provide a rejection reason', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await rejectPJO(pjo.id, rejectionReason)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'PJO rejected' })
        setRejectDialogOpen(false)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{pjo.pjo_number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <PJOStatusBadge status={pjo.status} />
            {pjo.jo_date && (
              <span className="text-sm text-muted-foreground">
                {formatDate(pjo.jo_date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <PDFButtons
            documentType="pjo"
            documentId={pjo.id}
            documentNumber={pjo.pjo_number}
            size="sm"
            variant="outline"
          />
          {isEditable && (
            <Button variant="outline" asChild>
              <Link href={`/proforma-jo/${pjo.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {pjo.status === 'draft' && (
            <Button onClick={handleSubmitForApproval} disabled={isLoading}>
              <Send className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          )}
          {pjo.status === 'pending_approval' && canApprove && (
            <>
              <Button onClick={handleApprove} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {pjo.status === 'approved' && !pjo.converted_to_jo && (
            <Button asChild>
              <Link href={`/proforma-jo/${pjo.id}/costs`}>
                <DollarSign className="mr-2 h-4 w-4" />
                Fill Actual Costs
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Rejection reason if rejected */}
      {pjo.status === 'rejected' && pjo.rejection_reason && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{pjo.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Engineering Status Banner */}
      {requiresEngineering && (
        <EngineeringStatusBanner
          status={engineeringStatus}
          assignedTo={pjo.engineering_assigned_to}
          assignedToName={null} // Would need to fetch user name
          assignedAt={pjo.engineering_assigned_at}
          completedAt={pjo.engineering_completed_at}
          completedByName={null}
          waivedReason={pjo.engineering_waived_reason}
          complexityFactors={pjo.complexity_factors as unknown as ComplexityFactor[] | null}
          complexityScore={pjo.complexity_score ?? undefined}
          canAssign={canAssign && engineeringStatus === 'pending' && !pjo.engineering_assigned_to}
          canComplete={canCompleteAssessment(userRole, userId, pjo.engineering_assigned_to) && 
            (engineeringStatus === 'pending' || engineeringStatus === 'in_progress')}
          canWaive={canWaive && (engineeringStatus === 'pending' || engineeringStatus === 'in_progress')}
          onAssign={() => setAssignDialogOpen(true)}
          onComplete={() => setCompleteReviewDialogOpen(true)}
          onWaive={() => setWaiveDialogOpen(true)}
        />
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Project</Label>
            <p className="font-medium">
              {pjo.projects ? (
                <Link href={`/projects/${pjo.projects.id}`} className="hover:underline">
                  {pjo.projects.name}
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Customer</Label>
            <p className="font-medium">
              {pjo.projects?.customers ? (
                <Link href={`/customers/${pjo.projects.customers.id}`} className="hover:underline">
                  {pjo.projects.customers.name}
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Lingkup Layanan</Label>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <p className="font-medium">{SERVICE_SCOPE_LABELS[(pjo as any).service_scope] || '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Commodity</Label>
            <p className="font-medium">{pjo.commodity || '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Quantity</Label>
            <p className="font-medium">
              {pjo.quantity ? `${pjo.quantity} ${pjo.quantity_unit || ''}` : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logistics */}
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
              {pjo.etd ? formatDate(pjo.etd) : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">ETA</Label>
            <p className="font-medium">
              {pjo.eta ? formatDate(pjo.eta) : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Carrier Type</Label>
            <p className="font-medium">{pjo.carrier_type || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Market Classification */}
      {pjo.market_type && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Market Classification</span>
              <MarketTypeBadge
                marketType={pjo.market_type as MarketType}
                score={pjo.complexity_score ?? undefined}
                showScore
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Inherited from Quotation indicator */}
            {pjo.quotation_id && (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-blue-800 border border-blue-200">
                <FileQuestion className="h-5 w-5" />
                <div className="flex-1">
                  <span className="text-sm font-medium">Inherited from Quotation</span>
                  {pjo.quotation && (
                    <Link 
                      href={`/quotations/${pjo.quotation.id}`}
                      className="ml-2 text-sm text-blue-600 hover:underline"
                    >
                      {pjo.quotation.quotation_number}
                    </Link>
                  )}
                </div>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Read-only</span>
              </div>
            )}

            {/* Complexity Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Complexity Score</span>
                <span className="font-medium">{pjo.complexity_score ?? 0} / 100</span>
              </div>
              <Progress
                value={Math.min((pjo.complexity_score ?? 0), 100)}
                className={`h-2 ${(pjo.complexity_score ?? 0) >= 20 ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
              />
            </div>

            {/* Engineering Warning */}
            {pjo.market_type === 'complex' && (
              <div className="flex items-center gap-2 rounded-md bg-orange-50 p-3 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">Engineering assessment required for complex projects</span>
              </div>
            )}

            {/* Triggered Factors */}
            {pjo.complexity_factors && Array.isArray(pjo.complexity_factors) && (pjo.complexity_factors as unknown as ComplexityFactor[]).length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Triggered Complexity Factors</Label>
                <div className="space-y-1">
                  {(pjo.complexity_factors as unknown as ComplexityFactor[]).map((factor, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{factor.criteria_name}</span>
                      <span className="text-muted-foreground">
                        {factor.triggered_value} (+{factor.weight})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cargo Specifications */}
            <div className="grid gap-4 md:grid-cols-3">
              {pjo.cargo_weight_kg && (
                <div>
                  <Label className="text-muted-foreground">Cargo Weight</Label>
                  <p className="font-medium">{Number(pjo.cargo_weight_kg).toLocaleString('id-ID')} kg</p>
                </div>
              )}
              {pjo.cargo_length_m && (
                <div>
                  <Label className="text-muted-foreground">Length</Label>
                  <p className="font-medium">{pjo.cargo_length_m} m</p>
                </div>
              )}
              {pjo.cargo_width_m && (
                <div>
                  <Label className="text-muted-foreground">Width</Label>
                  <p className="font-medium">{pjo.cargo_width_m} m</p>
                </div>
              )}
              {pjo.cargo_height_m && (
                <div>
                  <Label className="text-muted-foreground">Height</Label>
                  <p className="font-medium">{pjo.cargo_height_m} m</p>
                </div>
              )}
              {pjo.cargo_value && (
                <div>
                  <Label className="text-muted-foreground">Cargo Value</Label>
                  <p className="font-medium">{formatIDR(Number(pjo.cargo_value))}</p>
                </div>
              )}
              {pjo.duration_days && (
                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p className="font-medium">{pjo.duration_days} days</p>
                </div>
              )}
            </div>

            {/* Route Characteristics */}
            <div className="grid gap-4 md:grid-cols-2">
              {pjo.terrain_type && (
                <div>
                  <Label className="text-muted-foreground">Terrain Type</Label>
                  <p className="font-medium capitalize">{pjo.terrain_type}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4">
                {pjo.is_new_route && (
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">New Route</span>
                )}
                {pjo.requires_special_permit && (
                  <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">Special Permit</span>
                )}
                {pjo.is_hazardous && (
                  <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">Hazardous</span>
                )}
              </div>
            </div>

            {/* Pricing Approach */}
            {pjo.pricing_approach && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Pricing Approach</Label>
                  <p className="font-medium capitalize">{(pjo.pricing_approach as string).replace('_', ' ')}</p>
                </div>
                {pjo.pricing_notes && (
                  <div>
                    <Label className="text-muted-foreground">Pricing Notes</Label>
                    <p className="text-sm">{pjo.pricing_notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Engineering Assessments Section */}
      {requiresEngineering && (engineeringStatus === 'pending' || engineeringStatus === 'in_progress' || engineeringStatus === 'completed') && (
        <EngineeringAssessmentsSection
          assessments={assessments}
          canAddAssessment={false} // Assessments are auto-created on assignment
          canStartAssessment={canCompleteAssessment(userRole, userId, pjo.engineering_assigned_to)}
          canCompleteAssessment={canCompleteAssessment(userRole, userId, pjo.engineering_assigned_to)}
          canCancelAssessment={canWaive}
          onStartAssessment={handleStartAssessment}
          onCompleteAssessment={openCompleteAssessmentDialog}
          onCancelAssessment={handleCancelAssessment}
          isLoading={assessmentsLoading}
        />
      )}

      {/* Revenue Items */}
      {itemsLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <RevenueItemsSection
          pjoId={pjo.id}
          items={revenueItems}
          isEditable={isEditable}
          customerId={pjo.projects?.customers?.id}
          onRefresh={loadItems}
        />
      )}

      {/* Cost Items / Cost Confirmation */}
      {itemsLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-48 mt-2" />
          </CardContent>
        </Card>
      ) : showCostConfirmation ? (
        <CostConfirmationSection
          items={costItems}
          onRefresh={loadItems}
        />
      ) : (
        <CostItemsSection
          pjoId={pjo.id}
          items={costItems}
          totalRevenue={isOps ? 0 : totalRevenue}
          isEditable={isEditable}
          onRefresh={loadItems}
          hideProfit={isOps}
        />
      )}

      {/* Budget Summary - Show when approved and has cost items */}
      {itemsLoading && pjo.status === 'approved' ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </CardContent>
        </Card>
      ) : !itemsLoading && pjo.status === 'approved' && costItems.length > 0 ? (
        <BudgetSummary budget={budget} totalRevenue={totalRevenue} />
      ) : null}

      {/* Tax & Net Profit — hidden from ops role */}
      {!isOps && !itemsLoading && hasItemizedData && (
        <TaxProfitSection
          totalRevenue={totalRevenue}
          totalCosts={budget.total_estimated ?? budget.totalEstimated ?? 0}
          grossProfit={totalRevenue - (budget.total_estimated ?? budget.totalEstimated ?? 0)}
          grossMargin={totalRevenue > 0
            ? ((totalRevenue - (budget.total_estimated ?? budget.totalEstimated ?? 0)) / totalRevenue) * 100
            : 0
          }
        />
      )}

      {/* Conversion Status - Show when approved */}
      {pjo.status === 'approved' && (
        <ConversionStatus
          pjoId={pjo.id}
          pjoStatus={pjo.status}
          isConverted={pjo.converted_to_jo || false}
          jobOrderId={pjo.job_order_id}
        />
      )}

      {/* DP Invoice Section - Show when approved and not ops */}
      {pjo.status === 'approved' && !isOps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoice Down Payment (DP)
              </span>
              <Button size="sm" onClick={() => setDpDialogOpen(true)}>
                <Receipt className="mr-2 h-4 w-4" />
                Buat Invoice DP
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dpInvoicesLoading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Memuat invoice DP...
              </div>
            ) : dpInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Belum ada invoice DP untuk PJO ini.
              </p>
            ) : (
              <div className="space-y-3">
                {dpInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {inv.invoice_number}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {inv.invoice_date ? formatDate(inv.invoice_date) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatIDR(inv.total_amount ?? 0)}</span>
                      <Badge
                        variant={
                          inv.status === 'paid' ? 'default' :
                          inv.status === 'sent' ? 'secondary' :
                          inv.status === 'cancelled' ? 'destructive' :
                          'outline'
                        }
                      >
                        {inv.status === 'draft' ? 'Draft' :
                         inv.status === 'sent' ? 'Terkirim' :
                         inv.status === 'paid' ? 'Lunas' :
                         inv.status === 'overdue' ? 'Jatuh Tempo' :
                         inv.status === 'cancelled' ? 'Dibatalkan' :
                         inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t text-sm">
                  <span className="text-muted-foreground">Total DP Invoiced</span>
                  <span className="font-semibold">
                    {formatIDR(dpInvoices.reduce((sum, inv) =>
                      sum + (inv.status !== 'cancelled' ? (inv.total_amount ?? 0) : 0), 0
                    ))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legacy Financials - Show only if no itemized data */}
      {itemsLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : !hasItemizedData ? (
        <Card>
          <CardHeader>
            <CardTitle>Financials (Legacy)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-muted-foreground">Total Revenue</Label>
              <p className="text-lg font-semibold">{formatIDR(pjo.total_revenue ?? 0)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Expenses</Label>
              <p className="text-lg font-semibold">{formatIDR(pjo.total_expenses ?? 0)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Profit</Label>
              <p className={`text-lg font-semibold ${(pjo.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatIDR(pjo.profit ?? 0)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Margin</Label>
              <p className={`text-lg font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {margin.toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Notes */}
      {pjo.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{pjo.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <AttachmentsSection
        entityType="pjo"
        entityId={pjo.id}
        title="Attachments"
      />

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject PJO</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this PJO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isLoading || !rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Engineering Dialogs */}
      <AssignEngineeringDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        pjoId={pjo.id}
        pjoNumber={pjo.pjo_number}
        onAssign={handleAssignEngineering}
      />

      <WaiveReviewDialog
        open={waiveDialogOpen}
        onOpenChange={setWaiveDialogOpen}
        pjoId={pjo.id}
        pjoNumber={pjo.pjo_number}
        onWaive={handleWaiveReview}
      />

      <CompleteReviewDialog
        open={completeReviewDialogOpen}
        onOpenChange={setCompleteReviewDialogOpen}
        pjoId={pjo.id}
        assessments={assessments}
        onComplete={handleCompleteReview}
      />

      {selectedAssessmentId && selectedAssessmentType && (
        <CompleteAssessmentDialog
          open={completeAssessmentDialogOpen}
          onOpenChange={(open) => {
            setCompleteAssessmentDialogOpen(open)
            if (!open) {
              setSelectedAssessmentId(null)
              setSelectedAssessmentType(null)
            }
          }}
          assessmentId={selectedAssessmentId}
          assessmentType={selectedAssessmentType}
          onComplete={handleCompleteAssessment}
        />
      )}

      <ApprovalBlockedDialog
        open={approvalBlockedDialogOpen}
        onOpenChange={setApprovalBlockedDialogOpen}
        engineeringStatus={engineeringStatus}
        canAssign={canAssign && engineeringStatus === 'pending' && !pjo.engineering_assigned_to}
        canWaive={canWaive}
        onAssign={() => {
          setApprovalBlockedDialogOpen(false)
          setAssignDialogOpen(true)
        }}
        onWaive={() => {
          setApprovalBlockedDialogOpen(false)
          setWaiveDialogOpen(true)
        }}
      />

      {/* DP Invoice Creation Dialog */}
      <Dialog open={dpDialogOpen} onOpenChange={setDpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Invoice Down Payment</DialogTitle>
            <DialogDescription>
              Buat invoice DP berdasarkan rate yang sudah disetujui di {pjo.pjo_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dp-percentage">Persentase DP (%)</Label>
              <Input
                id="dp-percentage"
                type="number"
                min={1}
                max={100}
                value={dpPercentage}
                onChange={(e) => setDpPercentage(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dp-notes">Catatan (opsional)</Label>
              <Textarea
                id="dp-notes"
                value={dpNotes}
                onChange={(e) => setDpNotes(e.target.value)}
                placeholder="Catatan untuk invoice DP..."
                rows={2}
              />
            </div>
            {/* Preview */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total Revenue PJO</span>
                <span className="text-right font-medium">{formatIDR(totalRevenue)}</span>
                <span className="text-muted-foreground">DP ({dpPercentage}%)</span>
                <span className="text-right font-medium">{formatIDR(totalRevenue * (dpPercentage / 100))}</span>
                <span className="text-muted-foreground">PPN 11%</span>
                <span className="text-right font-medium">{formatIDR(totalRevenue * (dpPercentage / 100) * 0.11)}</span>
                <span className="text-muted-foreground font-semibold">Total Invoice DP</span>
                <span className="text-right font-semibold">
                  {formatIDR(totalRevenue * (dpPercentage / 100) * 1.11)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDpDialogOpen(false)} disabled={dpLoading}>
              Batal
            </Button>
            <Button onClick={handleCreateDPInvoice} disabled={dpLoading || dpPercentage <= 0 || dpPercentage > 100}>
              {dpLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuat...
                </>
              ) : (
                'Buat Invoice DP'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
