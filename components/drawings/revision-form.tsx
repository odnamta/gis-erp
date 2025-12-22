'use client';

// Revision Form Dialog
// Create a new revision for a drawing

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload } from './file-upload';
import { RevisionFormInput, ChangeReason, CHANGE_REASON_LABELS } from '@/types/drawing';
import { validateRevisionInput } from '@/lib/drawing-utils';
import { createRevision } from '@/lib/drawing-actions';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface RevisionFormProps {
  drawingId: string;
  currentRevision: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RevisionForm({
  drawingId,
  currentRevision,
  open,
  onOpenChange,
  onSuccess,
}: RevisionFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<RevisionFormInput>({
    change_description: '',
    change_reason: undefined,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validation = validateRevisionInput(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      const result = await createRevision(drawingId, formData);
      if (result.success) {
        toast.success(`Revision ${result.data?.revision_number} created successfully`);
        onOpenChange(false);
        onSuccess();
        // Reset form
        setFormData({ change_description: '', change_reason: undefined });
        setSelectedFile(null);
      } else {
        toast.error(result.error || 'Failed to create revision');
      }
    } catch (error) {
      console.error('Error creating revision:', error);
      toast.error('An error occurred while creating revision');
    } finally {
      setLoading(false);
    }
  };

  const changeReasons: ChangeReason[] = [
    'client_request',
    'design_change',
    'correction',
    'as_built',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Revision</DialogTitle>
          <DialogDescription>
            Current revision: <strong>{currentRevision}</strong>. This will create a new
            revision and archive the current one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <ul className="list-disc list-inside text-sm text-destructive">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="change_description">Change Description *</Label>
            <Textarea
              id="change_description"
              value={formData.change_description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  change_description: e.target.value,
                }))
              }
              placeholder="Describe what changed in this revision..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="change_reason">Change Reason</Label>
            <Select
              value={formData.change_reason || 'none'}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  change_reason: value === 'none' ? undefined : (value as ChangeReason),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific reason</SelectItem>
                {changeReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {CHANGE_REASON_LABELS[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Updated Drawing File (Optional)</Label>
            <FileUpload
              onFileSelect={setSelectedFile}
              currentFile={selectedFile}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Revision
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
