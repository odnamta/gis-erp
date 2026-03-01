'use client';

/**
 * SpkWoSection Component
 * Dedicated section for SPK (Surat Perintah Kerja) / WO (Work Order) document uploads.
 * Uses the category prefix convention in the description field to separate
 * SPK/WO documents from general project attachments.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileCheck2, Upload, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AttachmentList } from './attachment-list';
import {
  getAttachmentsByCategory,
  uploadCategorizedAttachment,
} from '@/lib/attachments/actions';
import { validateFile } from '@/lib/attachments/attachment-utils';
import { useToast } from '@/hooks/use-toast';
import type { AttachmentEntityType, DocumentAttachment } from '@/types/attachments';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB } from '@/types/attachments';

interface SpkWoSectionProps {
  entityType: AttachmentEntityType;
  entityId: string;
  maxFiles?: number;
}

export function SpkWoSection({
  entityType,
  entityId,
  maxFiles = 10,
}: SpkWoSectionProps) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAttachments = useCallback(async () => {
    setIsLoading(true);
    const result = await getAttachmentsByCategory(entityType, entityId, 'spk_wo');
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
  }, [entityType, entityId, toast]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleUploadComplete = (attachment: DocumentAttachment) => {
    // Strip the category prefix from description for display
    const cleanedAttachment = {
      ...attachment,
      description: attachment.description
        ?.replace('[SPK_WO] ', '')
        .replace('[SPK_WO]', '') || null,
    };
    setAttachments((prev) => [cleanedAttachment, ...prev]);
    toast({
      title: 'Berhasil',
      description: 'Dokumen SPK/WO berhasil diunggah',
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
      description: 'Dokumen SPK/WO berhasil dihapus',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5" />
          Dokumen SPK/WO ({attachments.length})
        </CardTitle>
        <CardDescription>
          Surat Perintah Kerja / Work Order dari customer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SpkWoUploadArea
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

/**
 * SpkWoUploadArea - Upload area that uses uploadCategorizedAttachment
 * to automatically tag documents as SPK/WO category
 */
interface UploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

function SpkWoUploadArea({
  entityType,
  entityId,
  maxFiles,
  existingCount,
  onUploadComplete,
  onError,
}: {
  entityType: AttachmentEntityType;
  entityId: string;
  maxFiles: number;
  existingCount: number;
  onUploadComplete: (attachment: DocumentAttachment) => void;
  onError: (error: string) => void;
}) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxFiles - existingCount - uploads.filter(u => u.status === 'uploading').length;
  const canUpload = remainingSlots > 0;

  const uploadFile = useCallback(async (file: File) => {
    setUploads(prev => [...prev, { file, progress: 0, status: 'uploading' }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      setUploads(prev => prev.map(u =>
        u.file === file ? { ...u, progress: 50 } : u
      ));

      const result = await uploadCategorizedAttachment(
        entityType,
        entityId,
        'spk_wo',
        formData
      );

      if (result.error) {
        setUploads(prev => prev.map(u =>
          u.file === file ? { ...u, status: 'error', error: result.error || 'Upload gagal' } : u
        ));
        onError(result.error);
      } else if (result.data) {
        setUploads(prev => prev.map(u =>
          u.file === file ? { ...u, progress: 100, status: 'success' } : u
        ));
        onUploadComplete(result.data);
        setTimeout(() => {
          setUploads(prev => prev.filter(u => u.file !== file));
        }, 2000);
      }
    } catch {
      setUploads(prev => prev.map(u =>
        u.file === file ? { ...u, status: 'error', error: 'Upload gagal' } : u
      ));
      onError('Terjadi kesalahan yang tidak terduga');
    }

    setDescription('');
  }, [entityType, entityId, description, onUploadComplete, onError]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesToUpload: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      const validation = validateFile(file, [...ALLOWED_MIME_TYPES], MAX_FILE_SIZE_MB);
      if (validation.valid) {
        filesToUpload.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      onError(errors.join('\n'));
    }

    for (const file of filesToUpload) {
      await uploadFile(file);
    }
  }, [remainingSlots, onError, uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (canUpload) setIsDragging(true);
  }, [canUpload]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (canUpload) handleFileSelect(e.dataTransfer.files);
  }, [canUpload, handleFileSelect]);

  const handleClick = () => {
    if (canUpload) fileInputRef.current?.click();
  };

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${!canUpload ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={!canUpload}
        />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {canUpload ? (
            <>
              <span className="font-medium text-foreground">Upload SPK/WO</span> atau drag and drop
            </>
          ) : (
            'Maksimum file tercapai'
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, JPEG, PNG maksimal 10MB
        </p>
      </div>

      {/* Description input */}
      {canUpload && (
        <div className="space-y-2">
          <Label htmlFor="spk-wo-description" className="text-sm">
            Keterangan (opsional)
          </Label>
          <Input
            id="spk-wo-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tambahkan keterangan untuk dokumen SPK/WO..."
            className="text-sm"
          />
        </div>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={`${upload.file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="h-1 mt-1" />
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-destructive mt-1">{upload.error}</p>
                )}
                {upload.status === 'success' && (
                  <p className="text-xs text-green-600 mt-1">Upload selesai</p>
                )}
              </div>
              {upload.status === 'uploading' ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeUpload(upload.file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Remaining slots indicator */}
      {existingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {remainingSlots} dari {maxFiles} slot tersisa
        </p>
      )}
    </div>
  );
}
