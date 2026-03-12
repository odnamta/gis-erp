'use client';

// components/assessments/review-workflow-panel.tsx
// Workflow panel for Technical Assessment review process (v0.58)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import { TechnicalAssessment, ConclusionType } from '@/types/assessment';
import {
  getStatusColor,
  getStatusLabel,
  formatDateTime,
  canSubmitForReview,
  canApproveOrReject,
} from '@/lib/assessment-utils';
import {
  submitForReview,
  approveAssessment,
  rejectAssessment,
} from '@/lib/assessment-actions';

interface ReviewWorkflowPanelProps {
  assessment: TechnicalAssessment;
  currentUserId?: string;
}

export function ReviewWorkflowPanel({
  assessment,
  currentUserId,
}: ReviewWorkflowPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [conclusion, setConclusion] = useState<ConclusionType>('approved');
  const [conclusionNotes, setConclusionNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  const canSubmit = canSubmitForReview(assessment.status);
  const canApprove = canApproveOrReject(assessment.status);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workflow Status</CardTitle>
        <CardDescription>Review and approval workflow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Status</span>
          <Badge className={getStatusColor(assessment.status)}>
            {getStatusLabel(assessment.status)}
          </Badge>
        </div>

        <Separator />

        {/* Workflow Timeline */}
        <div className="space-y-4">
          {/* Prepared */}
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-1.5 rounded-full ${assessment.prepared_by ? 'bg-green-100' : 'bg-gray-100'}`}>
              <User className={`h-3 w-3 ${assessment.prepared_by ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Prepared</p>
              {assessment.prepared_by_employee ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {assessment.prepared_by_employee.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(assessment.prepared_at)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not yet submitted</p>
              )}
            </div>
          </div>

          {/* Reviewed */}
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-1.5 rounded-full ${assessment.reviewed_by ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Clock className={`h-3 w-3 ${assessment.reviewed_by ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Reviewed</p>
              {assessment.reviewed_by_employee ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {assessment.reviewed_by_employee.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(assessment.reviewed_at)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Pending review</p>
              )}
            </div>
          </div>

          {/* Approved */}
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-1.5 rounded-full ${assessment.approved_by ? 'bg-green-100' : 'bg-gray-100'}`}>
              <CheckCircle className={`h-3 w-3 ${assessment.approved_by ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Approved</p>
              {assessment.approved_by_employee ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {assessment.approved_by_employee.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(assessment.approved_at)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Pending approval</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          {canSubmit && (
            <Button
              className="w-full"
              onClick={handleSubmitForReview}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit for Review
            </Button>
          )}

          {canApprove && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRejectDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                className="flex-1"
                onClick={() => setShowApproveDialog(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          )}

          {assessment.status === 'approved' && (
            <div className="text-center py-2">
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Assessment Approved
              </Badge>
            </div>
          )}

          {assessment.status === 'rejected' && (
            <div className="text-center py-2">
              <Badge variant="outline" className="text-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                Assessment Rejected
              </Badge>
              {assessment.revision_notes && (
                <p className="text-sm text-muted-foreground mt-2">
                  {assessment.revision_notes}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>

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
    </Card>
  );
}
