'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, Trash2, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ManagedSelect } from '@/components/ui/managed-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { uploadJmpDocument, deleteJmpDocument } from '@/lib/jmp-actions';
import { JmpDocument } from '@/types/jmp';
import { formatDate } from '@/lib/utils/format';

interface JmpDocumentUploadProps {
  jmpId: string;
  documents: JmpDocument[];
  onSuccess: () => void;
}

export function JmpDocumentUpload({ jmpId, documents, onSuccess }: JmpDocumentUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('other');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Ukuran file maksimal 10MB', variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    setDocName(file.name.replace(/\.[^/.]+$/, ''));
    setUploadDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', docName || selectedFile.name);
      formData.append('type', docType);

      const result = await uploadJmpDocument(jmpId, formData);

      if (result.success) {
        toast({ title: 'Success', description: 'Dokumen berhasil diupload' });
        onSuccess();
        resetForm();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteJmpDocument(jmpId, docToDelete);

      if (result.success) {
        toast({ title: 'Success', description: 'Dokumen berhasil dihapus' });
        onSuccess();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDocName('');
    setDocType('other');
    setUploadDialogOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openDeleteDialog = (url: string) => {
    setDocToDelete(url);
    setDeleteDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    return type;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Upload button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Dokumen
          </Button>
        </div>

        {/* Document list */}
        {documents.length > 0 ? (
          <ul className="space-y-2">
            {documents.map((doc, idx) => (
              <li key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name || doc.type}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getTypeLabel(doc.type)}</span>
                      {doc.uploadedAt && (
                        <>
                          <span>-</span>
                          <span>{formatDate(doc.uploadedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => openDeleteDialog(doc.url)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Belum ada dokumen yang diupload</p>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Dokumen</DialogTitle>
            <DialogDescription>
              {selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Dokumen</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Nama dokumen..."
              />
            </div>

            <div className="space-y-2">
              <Label>Tipe Dokumen</Label>
              <ManagedSelect
                category="jmp_document_type"
                value={docType}
                onValueChange={setDocType}
                placeholder="Pilih tipe dokumen"
                canManage={true}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={isUploading}>
              Batal
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
