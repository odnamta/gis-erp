'use client';

// Workflow Actions Component
// Buttons for drawing workflow transitions

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DrawingStatus, STATUS_LABELS } from '@/types/drawing';
import { getAllowedNextStatuses, canIssueDrawing } from '@/lib/drawing-utils';
import {
  submitForReview,
  submitForApproval,
  approveDrawing,
  issueDrawing,
  supersedeDrawing,
} from '@/lib/drawing-actions';
import {
  Send,
  Eye,
  CheckCircle,
  FileCheck,
  Archive,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowActionsProps {
  drawingId: string;
  currentStatus: DrawingStatus;
  fileUrl: string | null;
  onStatusChange: () => void;
}

const ACTION_CONFIG: Record<
  DrawingStatus,
  {
    label: string;
    icon: typeof Send;
    action: (id: string) => Promise<{ success: boolean; error?: string }>;
    confirmTitle: string;
    confirmDescription: string;
    variant?: 'default' | 'destructive' | 'outline';
  }
> = {
  for_review: {
    label: 'Submit for Review',
    icon: Eye,
    action: submitForReview,
    confirmTitle: 'Submit for Review',
    confirmDescription:
      'This will submit the drawing for review. The reviewer will be notified.',
  },
  for_approval: {
    label: 'Submit for Approval',
    icon: CheckCircle,
    action: submitForApproval,
    confirmTitle: 'Submit for Approval',
    confirmDescription:
      'This will submit the drawing for approval after review is complete.',
  },
  approved: {
    label: 'Approve Drawing',
    icon: FileCheck,
    action: approveDrawing,
    confirmTitle: 'Approve Drawing',
    confirmDescription:
      'This will approve the drawing. It can then be issued for distribution.',
  },
  issued: {
    label: 'Issue Drawing',
    icon: Send,
    action: issueDrawing,
    confirmTitle: 'Issue Drawing',
    confirmDescription:
      'This will issue the drawing for distribution. Make sure the file is uploaded.',
  },
  superseded: {
    label: 'Supersede Drawing',
    icon: Archive,
    action: supersedeDrawing,
    confirmTitle: 'Supersede Drawing',
    confirmDescription:
      'This will mark the drawing as superseded. It will no longer appear in the active register.',
    variant: 'destructive',
  },
  draft: {
    label: 'Return to Draft',
    icon: ArrowRight,
    action: async () => ({ success: false, error: 'Not implemented' }),
    confirmTitle: 'Return to Draft',
    confirmDescription: 'This will return the drawing to draft status.',
    variant: 'outline',
  },
};

export function WorkflowActions({
  drawingId,
  currentStatus,
  fileUrl,
  onStatusChange,
}: WorkflowActionsProps) {
  const [loading, setLoading] = useState<DrawingStatus | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    targetStatus: DrawingStatus | null;
  }>({ open: false, targetStatus: null });

  const allowedStatuses = getAllowedNextStatuses(currentStatus);

  if (allowedStatuses.length === 0) {
    return null;
  }

  const handleAction = async (targetStatus: DrawingStatus) => {
    // Check if can issue
    if (targetStatus === 'issued') {
      const check = canIssueDrawing({ file_url: fileUrl, status: currentStatus } as never);
      if (!check.canIssue) {
        toast.error(check.reason);
        return;
      }
    }

    setConfirmDialog({ open: true, targetStatus });
  };

  const executeAction = async () => {
    const targetStatus = confirmDialog.targetStatus;
    if (!targetStatus) return;

    const config = ACTION_CONFIG[targetStatus];
    if (!config) return;

    setLoading(targetStatus);
    setConfirmDialog({ open: false, targetStatus: null });

    try {
      const result = await config.action(drawingId);
      if (result.success) {
        toast.success(`Drawing ${STATUS_LABELS[targetStatus].toLowerCase()} successfully`);
        onStatusChange();
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Workflow action error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(null);
    }
  };

  const currentConfig = confirmDialog.targetStatus
    ? ACTION_CONFIG[confirmDialog.targetStatus]
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allowedStatuses.map((status) => {
              const config = ACTION_CONFIG[status];
              if (!config) return null;

              const Icon = config.icon;
              const isLoading = loading === status;

              return (
                <Button
                  key={status}
                  variant={config.variant || 'default'}
                  onClick={() => handleAction(status)}
                  disabled={loading !== null}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 mr-2" />
                  )}
                  {config.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, targetStatus: open ? confirmDialog.targetStatus : null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{currentConfig?.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {currentConfig?.confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
