'use client';

// components/assessments/assessment-detail-view.tsx
// Main detail view for Technical Assessments (v0.58)

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Edit,
  MoreVertical,
  Send,
  CheckCircle,
  XCircle,
  Copy,
  FileText,
  Calculator,
  Construction,
  Truck,
  Image,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { TechnicalAssessment, LiftingPlan, AxleLoadCalculation, ConclusionType } from '@/types/assessment';
import {
  getStatusColor,
  getStatusLabel,
  getConclusionColor,
  getConclusionLabel,
  formatDate,
  formatDateTime,
  canEditAssessment,
  canSubmitForReview,
  canApproveOrReject,
  canCreateRevision,
} from '@/lib/assessment-utils';
import {
  submitForReview,
  approveAssessment,
  rejectAssessment,
  createRevision,
} from '@/lib/assessment-actions';
import { AssessmentSummaryTab } from './assessment-summary-tab';
import { CalculationsTab } from './calculations-tab';
import { LiftingPlanTab } from './lifting-plan-tab';
import { AxleCalcTab } from './axle-calc-tab';
import { DrawingsTab } from './drawings-tab';
import { DocumentsTab } from './documents-tab';

interface AssessmentDetailViewProps {
  assessment: TechnicalAssessment;
  liftingPlans: LiftingPlan[];
  axleCalculations: AxleLoadCalculation[];
  currentUserId?: string;
}

export function AssessmentDetailView({
  assessment,
  liftingPlans,
  axleCalculations,
  currentUserId,
}: AssessmentDetailViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [conclusion, setConclusion] = useState<ConclusionType>('approved');
  const [conclusionNotes, setConclusionNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');

  const canEdit = canEditAssessment(assessment.status);
  const canSubmit = canSubmitForReview(assessment.status);
  const canApprove = canApproveOrReject(assessment.status);
  const canRevise = canCreateRevision(assessment.status);

  const isLiftingStudy = assessment.assessment_type?.type_code === 'LIFTING_STUDY';
  const isTransportStudy = ['LOAD_CALC', 'TRANSPORT_STUDY'].includes(
    assessment.assessment_type?.type_code || ''
  );

  const handleSubmitForReview = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const result = await submitForReview(assessment.id, currentUserId);
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const result = await approveAssessment(
        assessment.id,
        currentUserId,
        conclusion,
        conclusionNotes
      );
      if (result.success) {
        setShowApproveDialog(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const result = await rejectAssessment(assessment.id, rejectNotes);
      if (result.success) {
        setShowRejectDialog(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRevision = async () => {
    setLoading(true);
    try {
      const result = await createRevision(assessment.id, revisionNotes);
      if (result.success && result.data) {
        setShowRevisionDialog(false);
        router.push(`/engineering/assessments/${result.data.id}`);
      }
    } catch (error) {
      console.error('Error creating revision:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/engineering/assessments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assessments
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{assessment.assessment_number}</h1>
            <Badge className={getStatusColor(assessment.status)}>
              {getStatusLabel(assessment.status)}
            </Badge>
            {assessment.conclusion && (
              <Badge className={getConclusionColor(assessment.conclusion)}>
                {getConclusionLabel(assessment.conclusion)}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{assessment.title}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>Type: {assessment.assessment_type?.type_name}</span>
            <span>Rev: {assessment.revision_number}</span>
            <span>Created: {formatDate(assessment.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/engineering/assessments/${assessment.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}

          {canSubmit && (
            <Button onClick={handleSubmitForReview} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit for Review
            </Button>
          )}

          {canApprove && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={() => setShowApproveDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}

          {canRevise && (
            <Button variant="outline" onClick={() => setShowRevisionDialog(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Create Revision
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Workflow Info */}
      {(assessment.prepared_by_employee || assessment.reviewed_by_employee || assessment.approved_by_employee) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6">
              {assessment.prepared_by_employee && (
                <div>
                  <p className="text-xs text-muted-foreground">Prepared by</p>
                  <p className="font-medium">{assessment.prepared_by_employee.full_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(assessment.prepared_at)}</p>
                </div>
              )}
              {assessment.reviewed_by_employee && (
                <div>
                  <p className="text-xs text-muted-foreground">Reviewed by</p>
                  <p className="font-medium">{assessment.reviewed_by_employee.full_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(assessment.reviewed_at)}</p>
                </div>
              )}
              {assessment.approved_by_employee && (
                <div>
                  <p className="text-xs text-muted-foreground">Approved by</p>
                  <p className="font-medium">{assessment.approved_by_employee.full_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(assessment.approved_at)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conclusion Notes */}
      {assessment.conclusion_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conclusion Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{assessment.conclusion_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="calculations" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculations
          </TabsTrigger>
          {isLiftingStudy && (
            <TabsTrigger value="lifting" className="flex items-center gap-2">
              <Construction className="h-4 w-4" />
              Lifting Plan
            </TabsTrigger>
          )}
          {isTransportStudy && (
            <TabsTrigger value="axle" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Axle Loads
            </TabsTrigger>
          )}
          <TabsTrigger value="drawings" className="flex items-center gap-2">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-4 w-4" />
            Drawings
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <AssessmentSummaryTab assessment={assessment} />
        </TabsContent>

        <TabsContent value="calculations">
          <CalculationsTab assessment={assessment} canEdit={canEdit} />
        </TabsContent>

        {isLiftingStudy && (
          <TabsContent value="lifting">
            <LiftingPlanTab
              assessment={assessment}
              liftingPlans={liftingPlans}
              canEdit={canEdit}
            />
          </TabsContent>
        )}

        {isTransportStudy && (
          <TabsContent value="axle">
            <AxleCalcTab
              assessment={assessment}
              axleCalculations={axleCalculations}
              canEdit={canEdit}
            />
          </TabsContent>
        )}

        <TabsContent value="drawings">
          <DrawingsTab assessment={assessment} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab assessment={assessment} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Assessment</DialogTitle>
            <DialogDescription>
              Select the conclusion and add any notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Conclusion</Label>
              <Select value={conclusion} onValueChange={(v) => setConclusion(v as ConclusionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="approved_with_conditions">Approved with Conditions</SelectItem>
                  <SelectItem value="not_approved">Not Approved</SelectItem>
                  <SelectItem value="further_study">Further Study Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={conclusionNotes}
                onChange={(e) => setConclusionNotes(e.target.value)}
                placeholder="Add any conditions or notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Assessment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Notes *</Label>
            <Textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Explain why this assessment is being rejected..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !rejectNotes.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Revision</DialogTitle>
            <DialogDescription>
              Create a new revision of this assessment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Revision Notes *</Label>
            <Textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Describe what changes will be made in this revision..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRevision}
              disabled={loading || !revisionNotes.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
