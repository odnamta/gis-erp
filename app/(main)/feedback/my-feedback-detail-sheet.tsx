'use client';

import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { addFeedbackComment, getFeedbackComments } from '@/app/actions/feedback';
import {
  getStatusVariant,
  getStatusLabel,
  getFeedbackTypeLabel,
  formatFeedbackDateTime,
} from '@/lib/feedback-utils';
import type { FeedbackListItem, FeedbackComment } from '@/types/feedback';

interface MyFeedbackDetailSheetProps {
  feedback: FeedbackListItem | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function MyFeedbackDetailSheet({ feedback, onClose, onUpdate }: MyFeedbackDetailSheetProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (feedback) {
      loadComments();
    }
  }, [feedback]);

  const loadComments = async () => {
    if (!feedback) return;
    setLoadingComments(true);
    try {
      const result = await getFeedbackComments(feedback.id);
      if (result.success && result.data) {
        setComments(result.data);
      }
    } catch {
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!feedback || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const result = await addFeedbackComment(feedback.id, newComment, false);
      if (result.success) {
        setNewComment('');
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
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
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

          {/* Status Info */}
          <div className="p-3 bg-muted rounded-md text-sm space-y-1">
            <p><span className="font-medium">Submitted:</span> {formatFeedbackDateTime(feedback.created_at)}</p>
            {feedback.assigned_to_name && (
              <p><span className="font-medium">Assigned to:</span> {feedback.assigned_to_name}</p>
            )}
            {feedback.resolution_notes && (
              <div className="mt-2">
                <span className="font-medium">Resolution:</span>
                <p className="mt-1">{feedback.resolution_notes}</p>
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
                  <div key={comment.id} className="p-3 rounded-md bg-muted">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">{comment.comment_by_name || 'Unknown'}</span>
                      <span>{formatFeedbackDateTime(comment.created_at)}</span>
                    </div>
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
              <div className="flex justify-end">
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
