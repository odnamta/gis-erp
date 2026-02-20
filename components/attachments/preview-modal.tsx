'use client';

/**
 * PreviewModal Component
 * Modal for previewing image attachments
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PreviewModalProps } from '@/types/attachments';

export function PreviewModal({
  isOpen,
  onClose,
  attachment,
  signedUrl,
}: PreviewModalProps) {
  if (!attachment || !signedUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="pr-8 truncate">{attachment.file_name}</DialogTitle>
        </DialogHeader>
        <div className="relative flex items-center justify-center bg-muted/50 rounded-lg overflow-hidden min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={attachment.file_name}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
        {attachment.description && (
          <p className="text-sm text-muted-foreground">{attachment.description}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
