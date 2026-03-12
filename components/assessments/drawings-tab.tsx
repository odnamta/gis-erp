'use client';

// components/assessments/drawings-tab.tsx
// Drawings tab for Technical Assessment detail view (v0.58)

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Plus,
  Image as ImageIcon,
  Download,
  Trash2,
  Eye,
  Upload,
  Loader2,
  FileImage,
} from 'lucide-react';
import { TechnicalAssessment, DrawingAttachment } from '@/types/assessment';
import { updateAssessment } from '@/lib/assessment-actions';
import { formatDate } from '@/lib/assessment-utils';

interface DrawingsTabProps {
  assessment: TechnicalAssessment;
  canEdit: boolean;
}

export function DrawingsTab({ assessment, canEdit }: DrawingsTabProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreview, setShowPreview] = useState<DrawingAttachment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [drawingNumber, setDrawingNumber] = useState('');
  const [revision, setRevision] = useState('A');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const drawings = assessment.drawings || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);

    try {
      // In a real implementation, upload to Supabase Storage
      // For now, create a placeholder entry
      const newDrawing: DrawingAttachment = {
        id: crypto.randomUUID(),
        name: selectedFile.name,
        url: URL.createObjectURL(selectedFile), // Placeholder
        drawing_number: drawingNumber || `DWG-${Date.now()}`,
        revision: revision,
        uploaded_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _updatedDrawings = [...drawings, newDrawing];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _result = await updateAssessment(assessment.id, {
        // Note: drawings field would need to be added to UpdateAssessmentInput
      } as Record<string, unknown>);

      // For demo purposes, just close the dialog
      setShowUploadDialog(false);
      setSelectedFile(null);
      setDrawingNumber('');
      setRevision('A');
      router.refresh();
    } catch (error) {
      console.error('Error uploading drawing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);

    try {
      const _updatedDrawings = drawings.filter((d) => d.id !== deleteId);
      // Update assessment with new drawings array
      setDeleteId(null);
      router.refresh();
    } catch (error) {
      console.error('Error deleting drawing:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Technical Drawings</h3>
          <p className="text-sm text-muted-foreground">
            {drawings.length} drawing{drawings.length !== 1 ? 's' : ''} attached
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowUploadDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Drawing
          </Button>
        )}
      </div>

      {drawings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No drawings attached yet</p>
            {canEdit && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowUploadDialog(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First Drawing
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {drawings.map((drawing) => (
            <Card key={drawing.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardContent className="p-3">
                <p className="font-medium text-sm truncate">{drawing.name}</p>
                <p className="text-xs text-muted-foreground">
                  {drawing.drawing_number} Rev {drawing.revision}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(drawing.uploaded_at)}
                </p>
                <div className="flex gap-1 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(drawing)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={drawing.url} download={drawing.name}>
                      <Download className="h-3 w-3" />
                    </a>
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(drawing.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Drawing</DialogTitle>
            <DialogDescription>
              Upload a technical drawing for this assessment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.dwg,.dxf"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drawingNumber">Drawing Number</Label>
                <Input
                  id="drawingNumber"
                  value={drawingNumber}
                  onChange={(e) => setDrawingNumber(e.target.value)}
                  placeholder="e.g., DWG-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revision">Revision</Label>
                <Input
                  id="revision"
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="e.g., A"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={loading || !selectedFile}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{showPreview?.name}</DialogTitle>
            <DialogDescription>
              {showPreview?.drawing_number} Rev {showPreview?.revision}
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video bg-muted flex items-center justify-center rounded-lg">
            <ImageIcon className="h-24 w-24 text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drawing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this drawing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
