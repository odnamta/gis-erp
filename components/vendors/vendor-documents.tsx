'use client';

import { useState, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  AlertTriangle,
  XCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { VendorDocument, DocumentType } from '@/types/vendors';
import { DOCUMENT_TYPES, getDocumentExpiryStatus } from '@/lib/vendor-utils';
import { format } from 'date-fns';

interface VendorDocumentsProps {
  vendorId: string;
  documents: VendorDocument[];
  canEdit: boolean;
  onUpload: (formData: FormData) => Promise<{ error?: string }>;
  onDelete: (documentId: string) => Promise<{ error?: string }>;
  onRefresh: () => void;
}

export function VendorDocuments({
  vendorId,
  documents,
  canEdit,
  onUpload,
  onDelete,
  onRefresh,
}: VendorDocumentsProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<VendorDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form state
  const [selectedType, setSelectedType] = useState<DocumentType>('other');
  const [documentName, setDocumentName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedType('other');
    setDocumentName('');
    setExpiryDate('');
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', selectedType);
    if (documentName) formData.append('document_name', documentName);
    if (expiryDate) formData.append('expiry_date', expiryDate);

    const result = await onUpload(formData);

    if (result.error) {
      setUploadError(result.error);
      setIsUploading(false);
    } else {
      setIsUploading(false);
      setIsUploadDialogOpen(false);
      resetForm();
      onRefresh();
    }
  };

  const handleDeleteClick = (doc: VendorDocument) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    const result = await onDelete(documentToDelete.id);
    setIsDeleting(false);

    if (!result.error) {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      onRefresh();
    }
  };

  const getExpiryBadge = (expiryDate: string | null | undefined) => {
    const status = getDocumentExpiryStatus(expiryDate);
    if (status === 'no_expiry') return null;

    if (status === 'expired') {
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          Expired
        </Badge>
      );
    }

    if (status === 'expiring_soon') {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Expiring Soon
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs">
        Valid
      </Badge>
    );
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
            setIsUploadDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a document for this vendor. Supported formats: PDF, JPEG, PNG (max 10MB)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="document_type">Document Type *</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(v) => setSelectedType(v as DocumentType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document_name">Document Name</Label>
                  <Input
                    id="document_name"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Optional custom name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">File *</Label>
                  <Input
                    id="file"
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>

                {uploadError && (
                  <p className="text-sm text-destructive">{uploadError}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Documents Table */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No documents uploaded for this vendor</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {getDocumentTypeLabel(doc.document_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">
                        {doc.document_name || 'Unnamed document'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.expiry_date
                      ? format(new Date(doc.expiry_date), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>{getExpiryBadge(doc.expiry_date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {doc.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(doc)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.document_name || 'this document'}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
    </div>
  );
}
