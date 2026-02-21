'use client';

// Drawing Form Component
// Create/edit drawing with all fields

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from './file-upload';
import {
  DrawingCategory,
  DrawingFormInput,
  DrawingWithDetails,
  PAPER_SIZES,
} from '@/types/drawing';
import { createDrawing, updateDrawing, getCategories } from '@/lib/drawing-actions';
import { validateDrawingInput } from '@/lib/drawing-utils';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
}

interface JobOrder {
  id: string;
  jo_number: string;
}

interface DrawingFormProps {
  drawing?: DrawingWithDetails;
  mode: 'create' | 'edit';
}

export function DrawingForm({ drawing, mode }: DrawingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<DrawingCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<DrawingFormInput>({
    category_id: drawing?.category_id || '',
    project_id: drawing?.project_id || undefined,
    job_order_id: drawing?.job_order_id || undefined,
    title: drawing?.title || '',
    description: drawing?.description || '',
    scale: drawing?.scale || '',
    paper_size: drawing?.paper_size || 'A1',
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      loadJobOrders(formData.project_id);
    } else {
      setJobOrders([]);
    }
  }, [formData.project_id]);

  const loadFormData = async () => {
    try {
      const [categoriesData, projectsData] = await Promise.all([
        getCategories(),
        loadProjects(),
      ]);
      setCategories(categoriesData);
      setProjects(projectsData);

      if (drawing?.project_id) {
        await loadJobOrders(drawing.project_id);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const loadProjects = async (): Promise<Project[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');
    return data || [];
  };

  const loadJobOrders = async (projectId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('job_orders')
      .select('id, jo_number')
      .eq('project_id', projectId)
      .order('jo_number');
    setJobOrders(data || []);
  };

  const handleChange = (
    field: keyof DrawingFormInput,
    value: string | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validation = validateDrawingInput(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        const result = await createDrawing(formData);
        if (result.success && result.data) {
          // Upload file to Supabase storage if selected
          if (selectedFile) {
            const supabase = createClient();
            const fileExt = selectedFile.name.split('.').pop();
            const filePath = `drawings/${result.data.id}/original.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, selectedFile, { upsert: true });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);
              // Update drawing record with file URL
              await supabase
                .from('drawings')
                .update({ file_url: urlData.publicUrl })
                .eq('id', result.data.id);
            }
          }
          toast.success('Drawing created successfully');
          router.push(`/engineering/drawings/${result.data.id}`);
        } else {
          toast.error(result.error || 'Failed to create drawing');
        }
      } else if (drawing) {
        const result = await updateDrawing(drawing.id, formData);
        if (result.success) {
          toast.success('Drawing updated successfully');
          router.push(`/engineering/drawings/${drawing.id}`);
        } else {
          toast.error(result.error || 'Failed to update drawing');
        }
      }
    } catch (error) {
      console.error('Error saving drawing:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" asChild>
        <Link href="/engineering/drawings">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Drawings
        </Link>
      </Button>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <ul className="list-disc list-inside text-sm text-destructive">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter drawing title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => handleChange('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.category_code} - {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scale">Scale</Label>
                <Input
                  id="scale"
                  value={formData.scale || ''}
                  onChange={(e) => handleChange('scale', e.target.value)}
                  placeholder="e.g., 1:100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paper_size">Paper Size</Label>
                <Select
                  value={formData.paper_size || 'A1'}
                  onValueChange={(value) => handleChange('paper_size', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Association */}
        <Card>
          <CardHeader>
            <CardTitle>Project Association</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={formData.project_id || 'none'}
                onValueChange={(value) =>
                  handleChange('project_id', value === 'none' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.project_id && jobOrders.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="job_order">Job Order</Label>
                <Select
                  value={formData.job_order_id || 'none'}
                  onValueChange={(value) =>
                    handleChange('job_order_id', value === 'none' ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job order (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No job order</SelectItem>
                    {jobOrders.map((jo) => (
                      <SelectItem key={jo.id} value={jo.id}>
                        {jo.jo_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload - Only for create mode */}
        {mode === 'create' && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Drawing File</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileSelect={setSelectedFile}
                currentFile={selectedFile}
              />
              <p className="text-sm text-muted-foreground mt-2">
                You can upload the drawing file now or add it later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" asChild>
          <Link href="/engineering/drawings">Cancel</Link>
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {mode === 'create' ? 'Create Drawing' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
