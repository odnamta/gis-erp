'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QuotationWithRelations, QuotationStatus, QUOTATION_STATUS_LABELS, QUOTATION_STATUS_COLORS } from '@/types/quotation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Send, Trophy, XCircle, ArrowRight, AlertTriangle } from 'lucide-react'
import { MarketTypeBadge } from '@/components/ui/market-type-badge'
import { MarketType, ComplexityFactor } from '@/types/market-classification'
import { EngineeringStatusBanner } from '@/components/engineering/engineering-status-banner'
import { EngineeringAssessmentsSection } from '@/components/engineering/engineering-assessments-section'
import { AssignEngineeringDialog } from '@/components/engineering/assign-engineering-dialog'
import { WaiveReviewDialog } from '@/components/engineering/waive-review-dialog'
import { CompleteReviewDialog } from '@/components/engineering/complete-review-dialog'
import { CompleteAssessmentDialog } from '@/components/engineering/complete-assessment-dialog'
import { PDFButtons } from '@/components/pdf/pdf-buttons'
import { canWaiveEngineeringReview, canCompleteAssessment } from '@/lib/engineering-utils'
import { EngineeringStatus, EngineeringAssessment, AssessmentType } from '@/types/engineering'
import {
  getQuotationEngineeringAssessments,
  initializeQuotationEngineeringReview,
  startQuotationAssessment,
  completeQuotationAssessment,
  completeQuotationEngineeringReview,
  waiveQuotationEngineeringReview,
  cancelQuotationAssessment,
} from '@/app/(main)/quotations/engineering-actions'
import {
  submitQuotation,
  markQuotationWon,
  markQuotationLost,
  markQuotationReady,
} from '@/app/(main)/quotations/actions'
import { QuotationRevenueItems } from './quotation-revenue-items'
import { QuotationCostItems } from './quotation-cost-items'
import { PursuitCostsSection } from './pursuit-costs-section'
import { ConvertToPJODialog } from './convert-to-pjo-dialog'
import { SubmitQuotationDialog } from './submit-quotation-dialog'
import { MarkWonDialog } from './mark-won-dialog'
import { MarkLostDialog } from './mark-lost-dialog'

interface AssessmentWithUser extends EngineeringAssessment {
  assigned_user_name?: string | null
  completed_by_name?: string | null
}

interface QuotationDetailViewProps {
  quotation: QuotationWithRelations
  userRole?: string | null
  userId?: string | null
}

export function QuotationDetailView({ quotation, userRole, userId }: QuotationDetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // Engineering state
  const [assessments, setAssessments] = useState<AssessmentWithUser[]>([])
  const [assessmentsLoading, setAssessmentsLoading] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false)
  const [completeReviewDialogOpen, setCompleteReviewDialogOpen] = useState(false)
  const [completeAssessmentDialogOpen, setCompleteAssessmentDialogOpen] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | null>(null)
  
  // Action dialogs
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [wonDialogOpen, setWonDialogOpen] = useState(false)
  const [lostDialogOpen, setLostDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)

  const status = quotation.status as QuotationStatus
  const requiresEngineering = quotation.requires_engineering === true
  const engineeringStatus = (quotation.engineering_status as EngineeringStatus) || 'not_required'
  const canWaive = canWaiveEngineeringReview(userRole)
  const canAssign = canWaive
  const isEngineeringBlocking = requiresEngineering && 
    (engineeringStatus === 'pending' || engineeringStatus === 'in_progress')
  
  const isEditable = status === 'draft' || status === 'engineering_review'
  const canSubmit = status === 'ready'
  const canMarkOutcome = status === 'submitted'
  const canConvert = status === 'won'
  
  // Profit margin visibility - only owner, director, administration, manager, finance can see
  const canViewProfitMargin = ['owner', 'director', 'administration', 'manager', 'finance', 'sysadmin'].includes(userRole || '')

  const loadAssessments = async () => {
    if (!requiresEngineering) return
    setAssessmentsLoading(true)
    try {
      const result = await getQuotationEngineeringAssessments(quotation.id)
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

  useEffect(() => {
    loadAssessments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation.id])

  // Engineering action handlers
  async function handleAssignEngineering(assignedUserId: string) {
    const result = await initializeQuotationEngineeringReview(quotation.id, assignedUserId)
    if (result.error) {
      return { error: result.error }
    }
    toast({ title: 'Success', description: 'Engineering review assigned' })
    router.refresh()
    loadAssessments()
    return {}
  }

  async function handleWaiveReview(reason: string) {
    const result = await waiveQuotationEngineeringReview(quotation.id, reason)
    if (result.error) {
      return { error: result.error }
    }
    toast({ title: 'Success', description: 'Engineering review waived' })
    router.refresh()
    return {}
  }

  async function handleStartAssessment(assessmentId: string) {
    const result = await startQuotationAssessment(assessmentId)
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
    const result = await completeQuotationAssessment(selectedAssessmentId, data)
    if (result.error) {
      return { error: result.error }
    }
    toast({ title: 'Success', description: 'Assessment completed' })
    loadAssessments()
    router.refresh()
    return {}
  }

  async function handleCancelAssessment(assessmentId: string) {
    const result = await cancelQuotationAssessment(assessmentId)
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
  }) {
    const result = await completeQuotationEngineeringReview(quotation.id, data)
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

  async function handleMarkReady() {
    setIsLoading(true)
    try {
      const result = await markQuotationReady(quotation.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Quotation marked as ready' })
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
          <h1 className="text-2xl font-bold">{quotation.quotation_number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <QuotationStatusBadge status={status} />
            {quotation.created_at && (
              <span className="text-sm text-muted-foreground">
                Created {formatDate(quotation.created_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <PDFButtons
            documentType="quotation"
            documentId={quotation.id}
            documentNumber={quotation.quotation_number}
            userId={userId || undefined}
            showGenerateButton={!!userId}
          />
          {isEditable && (
            <Button variant="outline" asChild>
              <Link href={`/quotations/${quotation.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {status === 'draft' && !requiresEngineering && (
            <Button onClick={handleMarkReady} disabled={isLoading}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Mark Ready
            </Button>
          )}
          {status === 'engineering_review' && (engineeringStatus === 'completed' || engineeringStatus === 'waived') && (
            <Button onClick={handleMarkReady} disabled={isLoading}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Mark Ready
            </Button>
          )}
          {canSubmit && (
            <Button onClick={() => setSubmitDialogOpen(true)} disabled={isLoading}>
              <Send className="mr-2 h-4 w-4" />
              Submit to Client
            </Button>
          )}
          {canMarkOutcome && (
            <>
              <Button onClick={() => setWonDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Trophy className="mr-2 h-4 w-4" />
                Mark Won
              </Button>
              <Button variant="destructive" onClick={() => setLostDialogOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Mark Lost
              </Button>
            </>
          )}
          {canConvert && (
            <Button onClick={() => setConvertDialogOpen(true)}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Convert to PJO
            </Button>
          )}
        </div>
      </div>

      {/* Engineering Status Banner */}
      {requiresEngineering && (
        <EngineeringStatusBanner
          status={engineeringStatus}
          assignedTo={quotation.engineering_assigned_to}
          assignedToName={null}
          assignedAt={quotation.engineering_assigned_at}
          completedAt={quotation.engineering_completed_at}
          completedByName={null}
          waivedReason={quotation.engineering_waived_reason}
          complexityFactors={quotation.complexity_factors as unknown as ComplexityFactor[] | null}
          complexityScore={quotation.complexity_score ?? undefined}
          canAssign={canAssign && engineeringStatus === 'pending' && !quotation.engineering_assigned_to}
          canComplete={canCompleteAssessment(userRole, userId, quotation.engineering_assigned_to) && 
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
            <Label className="text-muted-foreground">Title</Label>
            <p className="font-medium">{quotation.title}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Customer</Label>
            <p className="font-medium">
              {quotation.customer ? (
                <Link href={`/customers/${quotation.customer.id}`} className="hover:underline">
                  {quotation.customer.name}
                </Link>
              ) : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Project</Label>
            <p className="font-medium">
              {quotation.project ? (
                <Link href={`/projects/${quotation.project.id}`} className="hover:underline">
                  {quotation.project.name}
                </Link>
              ) : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Commodity</Label>
            <p className="font-medium">{quotation.commodity || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* RFQ Details */}
      <Card>
        <CardHeader>
          <CardTitle>RFQ Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-muted-foreground">RFQ Number</Label>
            <p className="font-medium">{quotation.rfq_number || '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">RFQ Date</Label>
            <p className="font-medium">{quotation.rfq_date ? formatDate(quotation.rfq_date) : '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Received Date</Label>
            <p className="font-medium">{quotation.rfq_received_date ? formatDate(quotation.rfq_received_date) : '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Deadline</Label>
            <p className="font-medium">{quotation.rfq_deadline ? formatDate(quotation.rfq_deadline) : '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Route */}
      <Card>
        <CardHeader>
          <CardTitle>Route</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Origin</Label>
            <p className="font-medium">{quotation.origin}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Destination</Label>
            <p className="font-medium">{quotation.destination}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Estimated Shipments</Label>
            <p className="font-medium">{quotation.estimated_shipments || 1}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Duration</Label>
            <p className="font-medium">{quotation.duration_days ? `${quotation.duration_days} days` : '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Market Classification */}
      {quotation.market_type && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Market Classification</span>
              <MarketTypeBadge
                marketType={quotation.market_type as MarketType}
                score={quotation.complexity_score ?? undefined}
                showScore
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Complexity Score</span>
                <span className="font-medium">{quotation.complexity_score ?? 0} / 100</span>
              </div>
              <Progress
                value={Math.min((quotation.complexity_score ?? 0), 100)}
                className={`h-2 ${(quotation.complexity_score ?? 0) >= 20 ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
              />
            </div>

            {quotation.market_type === 'complex' && (
              <div className="flex items-center gap-2 rounded-md bg-orange-50 p-3 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">Engineering assessment required for complex projects</span>
              </div>
            )}

            {quotation.complexity_factors && Array.isArray(quotation.complexity_factors) && (quotation.complexity_factors as unknown as ComplexityFactor[]).length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Triggered Complexity Factors</Label>
                <div className="space-y-1">
                  {(quotation.complexity_factors as unknown as ComplexityFactor[]).map((factor, index) => (
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

            <div className="grid gap-4 md:grid-cols-3">
              {quotation.cargo_weight_kg && (
                <div>
                  <Label className="text-muted-foreground">Cargo Weight</Label>
                  <p className="font-medium">{Number(quotation.cargo_weight_kg).toLocaleString('id-ID')} kg</p>
                </div>
              )}
              {quotation.cargo_length_m && (
                <div>
                  <Label className="text-muted-foreground">Length</Label>
                  <p className="font-medium">{quotation.cargo_length_m} m</p>
                </div>
              )}
              {quotation.cargo_width_m && (
                <div>
                  <Label className="text-muted-foreground">Width</Label>
                  <p className="font-medium">{quotation.cargo_width_m} m</p>
                </div>
              )}
              {quotation.cargo_height_m && (
                <div>
                  <Label className="text-muted-foreground">Height</Label>
                  <p className="font-medium">{quotation.cargo_height_m} m</p>
                </div>
              )}
              {quotation.cargo_value && (
                <div>
                  <Label className="text-muted-foreground">Cargo Value</Label>
                  <p className="font-medium">{formatIDR(Number(quotation.cargo_value))}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              {quotation.terrain_type && (
                <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded capitalize">{quotation.terrain_type}</span>
              )}
              {quotation.is_new_route && (
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">New Route</span>
              )}
              {quotation.requires_special_permit && (
                <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">Special Permit</span>
              )}
              {quotation.is_hazardous && (
                <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">Hazardous</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engineering Assessments Section */}
      {requiresEngineering && (engineeringStatus === 'pending' || engineeringStatus === 'in_progress' || engineeringStatus === 'completed') && (
        <EngineeringAssessmentsSection
          assessments={assessments}
          canAddAssessment={false}
          canStartAssessment={canCompleteAssessment(userRole, userId, quotation.engineering_assigned_to)}
          canCompleteAssessment={canCompleteAssessment(userRole, userId, quotation.engineering_assigned_to)}
          canCancelAssessment={canWaive}
          onStartAssessment={handleStartAssessment}
          onCompleteAssessment={openCompleteAssessmentDialog}
          onCancelAssessment={handleCancelAssessment}
          isLoading={assessmentsLoading}
        />
      )}

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-muted-foreground">Total Revenue</Label>
            <p className="text-lg font-semibold">{formatIDR(quotation.total_revenue || 0)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Total Cost</Label>
            <p className="text-lg font-semibold">{formatIDR(quotation.total_cost || 0)}</p>
          </div>
          {canViewProfitMargin && (
            <>
              <div>
                <Label className="text-muted-foreground">Gross Profit</Label>
                <p className={`text-lg font-semibold ${(quotation.gross_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatIDR(quotation.gross_profit || 0)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Margin</Label>
                <p className={`text-lg font-semibold ${(quotation.profit_margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(quotation.profit_margin || 0).toFixed(1)}%
                </p>
              </div>
            </>
          )}
          <div>
            <Label className="text-muted-foreground">Pursuit Cost</Label>
            <p className="text-lg font-semibold">{formatIDR(quotation.total_pursuit_cost || 0)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Items */}
      <QuotationRevenueItems
        quotationId={quotation.id}
        items={quotation.revenue_items || []}
        isEditable={isEditable}
      />

      {/* Cost Items */}
      <QuotationCostItems
        quotationId={quotation.id}
        items={quotation.cost_items || []}
        isEditable={isEditable}
      />

      {/* Pursuit Costs */}
      <PursuitCostsSection
        quotationId={quotation.id}
        items={quotation.pursuit_costs || []}
        estimatedShipments={quotation.estimated_shipments || 1}
        isEditable={isEditable}
      />

      {/* Notes */}
      {quotation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Outcome Info (for won/lost) */}
      {(status === 'won' || status === 'lost') && (
        <Card className={status === 'won' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className={status === 'won' ? 'text-green-800' : 'text-red-800'}>
              {status === 'won' ? 'Won' : 'Lost'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Outcome Date</Label>
              <p className="font-medium">{quotation.outcome_date ? formatDate(quotation.outcome_date) : '-'}</p>
            </div>
            {status === 'lost' && quotation.outcome_reason && (
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{quotation.outcome_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Engineering Dialogs */}
      <AssignEngineeringDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        pjoId={quotation.id}
        pjoNumber={quotation.quotation_number}
        onAssign={handleAssignEngineering}
      />

      <WaiveReviewDialog
        open={waiveDialogOpen}
        onOpenChange={setWaiveDialogOpen}
        pjoId={quotation.id}
        pjoNumber={quotation.quotation_number}
        onWaive={handleWaiveReview}
      />

      <CompleteReviewDialog
        open={completeReviewDialogOpen}
        onOpenChange={setCompleteReviewDialogOpen}
        pjoId={quotation.id}
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

      {/* Action Dialogs */}
      <SubmitQuotationDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        quotationId={quotation.id}
        quotationNumber={quotation.quotation_number}
      />

      <MarkWonDialog
        open={wonDialogOpen}
        onOpenChange={setWonDialogOpen}
        quotationId={quotation.id}
        quotationNumber={quotation.quotation_number}
      />

      <MarkLostDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        quotationId={quotation.id}
        quotationNumber={quotation.quotation_number}
      />

      <ConvertToPJODialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        quotation={quotation}
      />
    </div>
  )
}

function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const label = QUOTATION_STATUS_LABELS[status] || status
  const colorClass = QUOTATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  
  return (
    <Badge variant="outline" className={colorClass}>
      {label}
    </Badge>
  )
}
