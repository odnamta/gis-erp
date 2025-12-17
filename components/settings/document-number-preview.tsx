'use client';

import { previewDocumentNumber, validateDocumentFormat } from '@/lib/company-settings-utils';
import { AlertCircle } from 'lucide-react';

interface DocumentNumberPreviewProps {
  format: string;
  sequenceNumber?: number;
  label?: string;
}

export function DocumentNumberPreview({
  format,
  sequenceNumber = 1,
  label = 'Preview',
}: DocumentNumberPreviewProps) {
  const validation = validateDocumentFormat(format);
  
  if (!validation.valid) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Missing: {validation.missingPlaceholders.join(', ')}</span>
      </div>
    );
  }
  
  const preview = previewDocumentNumber(format, sequenceNumber);
  
  return (
    <div className="text-sm text-muted-foreground">
      {label}: <span className="font-mono font-medium text-foreground">{preview}</span>
    </div>
  );
}
