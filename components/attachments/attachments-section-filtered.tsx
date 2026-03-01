'use client';

/**
 * AttachmentsSectionFiltered Component
 * Same as AttachmentsSection but excludes documents from a specific category.
 * Used alongside SpkWoSection to prevent SPK/WO documents from appearing
 * in the general attachments section.
 */

import { useState, useEffect, useCallback } from 'react';
import { Paperclip } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentUploader } from './document-uploader';
import { AttachmentList } from './attachment-list';
import { getAttachmentsExcludingCategory } from '@/lib/attachments/actions';
import type { AttachmentCategory } from '@/lib/attachments/actions';
import { useToast } from '@/hooks/use-toast';
import type { AttachmentEntityType, DocumentAttachment } from '@/types/attachments';

interface AttachmentsSectionFilteredProps {
  entityType: AttachmentEntityType;
  entityId: string;
  title?: string;
  maxFiles?: number;
  excludeCategory: AttachmentCategory;
}

export function AttachmentsSectionFiltered({
  entityType,
  entityId,
  title = 'Attachments',
  maxFiles = 10,
  excludeCategory,
}: AttachmentsSectionFilteredProps) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAttachments = useCallback(async () => {
    setIsLoading(true);
    const result = await getAttachmentsExcludingCategory(entityType, entityId, excludeCategory);
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      setAttachments(result.data);
    }
    setIsLoading(false);
  }, [entityType, entityId, excludeCategory, toast]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleUploadComplete = (attachment: DocumentAttachment) => {
    setAttachments((prev) => [attachment, ...prev]);
    toast({
      title: 'Berhasil',
      description: 'File berhasil diunggah',
    });
  };

  const handleUploadError = (error: string) => {
    toast({
      title: 'Upload Error',
      description: error,
      variant: 'destructive',
    });
  };

  const handleDelete = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    toast({
      title: 'Berhasil',
      description: 'File berhasil dihapus',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          {title} ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DocumentUploader
          entityType={entityType}
          entityId={entityId}
          maxFiles={maxFiles}
          existingCount={attachments.length}
          onUploadComplete={handleUploadComplete}
          onError={handleUploadError}
        />
        <AttachmentList
          entityType={entityType}
          entityId={entityId}
          attachments={attachments}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
