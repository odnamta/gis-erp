'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/(main)/hr/leave/actions';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ApproveRejectDialogProps {
  requestId: string;
  requestNumber: string;
  employeeName: string;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApproveRejectDialog({
  requestId,
  requestNumber,
  employeeName,
  action,
  onClose,
  onSuccess,
}: ApproveRejectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const result = await approveLeaveRequest(requestId);
      if (result.success) {
        toast.success('Leave request approved');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to approve request');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await rejectLeaveRequest(requestId, rejectionReason);
      if (result.success) {
        toast.success('Leave request rejected');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to reject request');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  if (action === 'approve') {
    return (
      <AlertDialog open={true} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Leave Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve leave request <strong>{requestNumber}</strong> from{' '}
              <strong>{employeeName}</strong>?
              <br /><br />
              This will update their leave balance and mark the dates as leave in attendance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button onClick={handleApprove} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (action === 'reject') {
    return (
      <AlertDialog open={true} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Leave Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to reject leave request <strong>{requestNumber}</strong> from{' '}
              <strong>{employeeName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection_reason">Rejection Reason *</Label>
            <Textarea
              id="rejection_reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button 
              onClick={handleReject} 
              disabled={isSubmitting || !rejectionReason.trim()} 
              variant="destructive"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}
