'use client';

/**
 * DocumentUploader Component
 * Reusable file upload component for attaching documents to entities
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { uploadAttachment } from '@/lib/attachments/actions';
import { validateFile } from '@/lib/attachments/attachment-utils';
import type { DocumentUploaderProps } from '@/types/attachments';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_MB,
  DEFAULT_MAX_FILES,
} from '@/types/attachments';

interface UploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function DocumentUploader({
  entityType,
  entityId,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeMB = MAX_FILE_SIZE_MB,
  allowedTypes = [...ALLOWED_MIME_TYPES],
  onUploadComplete,
  onError,
  existingCount = 0,
}: DocumentUploaderProps) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxFiles - existingCount - uploads.filter(u => u.status === 'uploading').length;
  const canUpload = remainingSlots > 0;

  const uploadFile = useCallback(async (file: File) => {
    // Add to uploads list
    setUploads(prev => [...prev, {
      file,
      progress: 0,
      status: 'uploading',
    }]);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      // Simulate progress (actual progress tracking would require XHR)
      setUploads(prev => prev.map(u =>
        u.file === file ? { ...u, progress: 50 } : u
      ));

      // Upload
      const result = await uploadAttachment(entityType, entityId, formData);

      if (result.error) {
        setUploads(prev => prev.map(u =>
          u.file === file ? { ...u, status: 'error', error: result.error || 'Upload failed' } : u
        ));
        onError?.(result.error);
      } else if (result.data) {
        setUploads(prev => prev.map(u =>
          u.file === file ? { ...u, progress: 100, status: 'success' } : u
        ));
        onUploadComplete?.(result.data);

        // Clear successful upload after a delay
        setTimeout(() => {
          setUploads(prev => prev.filter(u => u.file !== file));
        }, 2000);
      }
    } catch {
      setUploads(prev => prev.map(u =>
        u.file === file ? { ...u, status: 'error', error: 'Upload failed' } : u
      ));
      onError?.('An unexpected error occurred');
    }

    // Clear description after upload
    setDescription('');
  }, [entityType, entityId, description, onUploadComplete, onError]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesToUpload: File[] = [];
    const errors: string[] = [];

    // Validate each file
    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      const validation = validateFile(file, allowedTypes, maxSizeMB);

      if (validation.valid) {
        filesToUpload.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    // Report validation errors
    if (errors.length > 0) {
      onError?.(errors.join('\n'));
    }

    // Upload valid files
    for (const file of filesToUpload) {
      await uploadFile(file);
    }
  }, [remainingSlots, allowedTypes, maxSizeMB, onError, uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (canUpload) {
      setIsDragging(true);
    }
  }, [canUpload]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (canUpload) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [canUpload, handleFileSelect]);

  const handleClick = () => {
    if (canUpload) {
      fileInputRef.current?.click();
    }
  };

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file));
  };

  const acceptTypes = allowedTypes.join(',');

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
          accept={acceptTypes}
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={!canUpload}
        />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {canUpload ? (
            <>
              <span className="font-medium text-foreground">Click to upload</span> or drag and drop
            </>
          ) : (
            'Maximum files reached'
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, JPEG, PNG up to {maxSizeMB}MB
        </p>
      </div>

      {/* Description input */}
      {canUpload && (
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm">
            Description (optional)
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for the file..."
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
                  <p className="text-xs text-green-600 mt-1">Upload complete</p>
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
          {remainingSlots} of {maxFiles} slots remaining
        </p>
      )}
    </div>
  );
}
