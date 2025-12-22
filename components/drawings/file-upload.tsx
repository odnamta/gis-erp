'use client';

// File Upload Component for Drawings
// Supports drag-and-drop with file type validation

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { isValidDrawingFileType, formatFileSize } from '@/lib/drawing-utils';
import { VALID_FILE_EXTENSIONS } from '@/types/drawing';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
  existingFileUrl?: string | null;
  existingFileName?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  currentFile,
  existingFileUrl,
  existingFileName,
  disabled = false,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!isValidDrawingFileType(file.name)) {
        setError(
          `Invalid file type. Only ${VALID_FILE_EXTENSIONS.join(', ').toUpperCase()} files are supported.`
        );
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/acad': ['.dwg'],
      'application/dxf': ['.dxf'],
      'image/vnd.dwg': ['.dwg'],
      'image/vnd.dxf': ['.dxf'],
    },
  });

  const handleRemove = () => {
    setError(null);
    onFileSelect(null);
  };

  const displayFile = currentFile || (existingFileUrl ? { name: existingFileName || 'Existing file' } : null);

  return (
    <div className="space-y-2">
      {displayFile ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <File className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-sm">{displayFile.name}</p>
              {currentFile && (
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(Math.round(currentFile.size / 1024))}
                </p>
              )}
              {!currentFile && existingFileUrl && (
                <p className="text-xs text-muted-foreground">Current file</p>
              )}
            </div>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-primary font-medium">Drop the file here...</p>
          ) : (
            <>
              <p className="font-medium">
                Drag & drop a file here, or click to select
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: {VALID_FILE_EXTENSIONS.join(', ').toUpperCase()}
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
