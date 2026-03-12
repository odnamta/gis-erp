'use client';

/**
 * AttachmentList Component
 * Displays a list of attachments with preview, download, and delete actions
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { getSignedUrl, deleteAttachment } from '@/lib/attachments/actions';
import { getFileIcon, formatFileSize, isImageType, isPdfType } from '@/lib/attachments/attachment-utils';
import type { AttachmentListProps, DocumentAttachment } from '@/types/attachments';
import { PreviewModal } from './preview-modal';

export function AttachmentList({
  entityType: _entityType,
  entityId: _entityId,
  attachments,
  onDelete,
  isLoading = false,
}: AttachmentListProps) {
  const [previewAttachment, setPreviewAttachment] = useState<DocumentAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handlePreview = async (attachment: DocumentAttachment) => {
    setLoadingAction(`preview-${attachment.id}`);
    
    const result = await getSignedUrl(attachment.storage_path);
    
    if (result.url) {
      if (isPdfType(attachment.file_type)) {
        // Open PDF in new tab
        window.open(result.url, '_blank');
      } else if (isImageType(attachment.file_type)) {
        // Show image in modal
        setPreviewUrl(result.url);
        setPreviewAttachment(attachment);
      }
    }
    
    setLoadingAction(null);
  };

  const handleDownload = async (attachment: DocumentAttachment) => {
    setLoadingAction(`download-${attachment.id}`);
    
    const result = await getSignedUrl(attachment.storage_path);
    
    if (result.url) {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = result.url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setLoadingAction(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    
    const result = await deleteAttachment(deleteTarget.id);
    
    if (result.success) {
      onDelete?.(deleteTarget.id);
    }
    
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const closePreview = () => {
    setPreviewAttachment(null);
    setPreviewUrl(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No attachments yet</p>
        <p className="text-xs mt-1">Upload files to attach them to this record</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.file_type);
          const isLoadingPreview = loadingAction === `preview-${attachment.id}`;
          const isLoadingDownload = loadingAction === `download-${attachment.id}`;
          
          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* File icon */}
              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-muted rounded">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              
              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={attachment.file_name}>
                  {attachment.file_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  {attachment.created_at && (
                    <>
                      <span>•</span>
                      <span>{format(new Date(attachment.created_at), 'dd/MM/yyyy')}</span>
                    </>
                  )}
                  {attachment.uploader_name && (
                    <>
                      <span>•</span>
                      <span>{attachment.uploader_name}</span>
                    </>
                  )}
                </div>
                {attachment.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate" title={attachment.description}>
                    {attachment.description}
                  </p>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePreview(attachment)}
                  disabled={isLoadingPreview}
                  title="Preview"
                >
                  {isLoadingPreview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(attachment)}
                  disabled={isLoadingDownload}
                  title="Download"
                >
                  {isLoadingDownload ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(attachment)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={!!previewAttachment}
        onClose={closePreview}
        attachment={previewAttachment}
        signedUrl={previewUrl}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.file_name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
