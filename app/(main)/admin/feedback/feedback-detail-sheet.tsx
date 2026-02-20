'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Send, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  updateFeedbackStatus,
  addFeedbackComment,
  getFeedbackComments,
} from '@/app/actions/feedback';
import {
  getStatusVariant,
  getStatusLabel,
  getFeedbackTypeLabel,
  formatFeedbackDateTime,
  getStatusOptions,
} from '@/lib/feedback-utils';
import type { FeedbackListItem, FeedbackComment, FeedbackStatus } from '@/types/feedback';

interface FeedbackDetailSheetProps {
  feedback: FeedbackListItem | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function FeedbackDetailSheet({ feedback, onClose, onUpdate }: FeedbackDetailSheetProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadComments = useCallback(async () => {
    if (!feedback) return;
    setLoadingComments(true);
    try {
      const result = await getFeedbackComments(feedback.id);
      if (result.success && result.data) {
        setComments(result.data);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [feedback]);

  useEffect(() => {
    if (feedback) {
      loadComments();
      setResolutionNotes(feedback.resolution_notes || '');
    }
  }, [feedback, loadComments]);

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    if (!feedback) return;
    setUpdatingStatus(true);
    try {
      const result = await updateFeedbackStatus(
        feedback.id,
        newStatus,
        ['resolved', 'closed', 'wont_fix'].includes(newStatus) ? resolutionNotes : undefined
      );
      if (result.success) {
        toast({ title: 'Status updated' });
        onUpdate();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!feedback || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const result = await addFeedbackComment(feedback.id, newComment, isInternal);
      if (result.success) {
        setNewComment('');
        setIsInternal(false);
        loadComments();
        onUpdate();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!feedback) return null;

  return (
    <Sheet open={!!feedback} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{feedback.ticket_number}</span>
            <Badge variant={getStatusVariant(feedback.status)}>
              {getStatusLabel(feedback.status)}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            {getFeedbackTypeLabel(feedback.feedback_type)}
            {feedback.severity && (
              <span className="ml-2">
                • <span className="capitalize">{feedback.severity}</span> severity
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Title & Description */}
          <div>
            <h3 className="font-semibold text-lg">{feedback.title}</h3>
            <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
              {feedback.description}
            </p>
          </div>

          <Separator />

          {/* Bug-specific fields */}
          {feedback.feedback_type === 'bug' && (
            <div className="space-y-4">
              {feedback.steps_to_reproduce && (
                <div>
                  <Label className="text-sm font-medium">Steps to Reproduce</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{feedback.steps_to_reproduce}</p>
                </div>
              )}
              {feedback.expected_behavior && (
                <div>
                  <Label className="text-sm font-medium">Expected Behavior</Label>
                  <p className="mt-1 text-sm">{feedback.expected_behavior}</p>
                </div>
              )}
              {feedback.actual_behavior && (
                <div>
                  <Label className="text-sm font-medium">Actual Behavior</Label>
                  <p className="mt-1 text-sm">{feedback.actual_behavior}</p>
                </div>
              )}
            </div>
          )}

          {/* Improvement-specific fields */}
          {feedback.feedback_type === 'improvement' && (
            <div className="space-y-4">
              {feedback.current_behavior && (
                <div>
                  <Label className="text-sm font-medium">Current Behavior</Label>
                  <p className="mt-1 text-sm">{feedback.current_behavior}</p>
                </div>
              )}
              {feedback.desired_behavior && (
                <div>
                  <Label className="text-sm font-medium">Desired Behavior</Label>
                  <p className="mt-1 text-sm">{feedback.desired_behavior}</p>
                </div>
              )}
              {feedback.business_justification && (
                <div>
                  <Label className="text-sm font-medium">Business Justification</Label>
                  <p className="mt-1 text-sm">{feedback.business_justification}</p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Screenshots */}
          {feedback.screenshots && feedback.screenshots.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Screenshots</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {feedback.screenshots.map((screenshot, index) => (
                  <a
                    key={index}
                    href={screenshot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group w-20 h-20 rounded-md overflow-hidden border"
                  >
                    <img
                      src={screenshot.url}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Context Info */}
          <div className="p-3 bg-muted rounded-md text-sm space-y-1">
            <p><span className="font-medium">Submitted by:</span> {feedback.submitted_by_name || 'Unknown'}</p>
            <p><span className="font-medium">Email:</span> {feedback.submitted_by_email || '-'}</p>
            <p><span className="font-medium">Role:</span> {feedback.submitted_by_role || '-'}</p>
            <p><span className="font-medium">Module:</span> {feedback.module || feedback.affected_module || '-'}</p>
            <p><span className="font-medium">Page:</span> {feedback.page_url ? new URL(feedback.page_url).pathname : '-'}</p>
            <p><span className="font-medium">Submitted:</span> {formatFeedbackDateTime(feedback.created_at)}</p>
          </div>

          <Separator />

          {/* Status Management */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Update Status</Label>
            <div className="flex gap-2">
              <Select
                value={feedback.status}
                onValueChange={(v) => handleStatusChange(v as FeedbackStatus)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getStatusOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {['resolved', 'closed', 'wont_fix'].includes(feedback.status) && (
              <div>
                <Label className="text-sm font-medium">Resolution Notes</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add resolution notes..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Comments */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Comments ({comments.length})</Label>
            
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-md ${comment.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-muted'}`}
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">{comment.comment_by_name || 'Unknown'}</span>
                      <span>{formatFeedbackDateTime(comment.created_at)}</span>
                    </div>
                    {comment.is_internal && (
                      <Badge variant="outline" className="mt-1 text-xs">Internal</Badge>
                    )}
                    <p className="mt-2 text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={(checked) => setIsInternal(checked === true)}
                  />
                  <label htmlFor="internal" className="text-sm text-muted-foreground">
                    Internal comment (not visible to submitter)
                  </label>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  {submittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2">Send</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
