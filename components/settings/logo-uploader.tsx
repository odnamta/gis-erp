'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { validateLogoFile } from '@/lib/company-settings-utils';
import { uploadCompanyLogo } from '@/app/(main)/settings/company/actions';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface LogoUploaderProps {
  currentLogoUrl: string | null;
  onUploadComplete: (url: string) => void;
}

export function LogoUploader({ currentLogoUrl, onUploadComplete }: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Show preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const result = await uploadCompanyLogo(formData);

      if (result.success && result.url) {
        onUploadComplete(result.url);
        setPreviewUrl(result.url);
      } else {
        setError(result.error || 'Upload failed');
        setPreviewUrl(currentLogoUrl);
      }
    } catch {
      setError('Upload failed');
      setPreviewUrl(currentLogoUrl);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };


  const handleRemoveLogo = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Logo Preview */}
        <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
          {previewUrl ? (
            <>
              <Image
                src={previewUrl}
                alt="Company logo"
                fill
                className="object-contain p-2"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>

        {/* Upload Button */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
            id="logo-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Logo
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, or SVG. Max 2MB.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
