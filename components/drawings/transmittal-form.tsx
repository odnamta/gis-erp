'use client';

// Transmittal Form Component
// Create a new drawing transmittal

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
import { DrawingSelector } from './drawing-selector';
import {
  TransmittalFormInput,
  TransmittalPurpose,
  TransmittalDrawingItem,
  DrawingWithDetails,
  PURPOSE_LABELS,
} from '@/types/drawing';
import { createTransmittal, getDrawings } from '@/lib/drawing-actions';
import { validateTransmittalInput } from '@/lib/drawing-utils';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
}

export function TransmittalForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [drawings, setDrawings] = useState<DrawingWithDetails[]>([]);

  const [formData, setFormData] = useState<TransmittalFormInput>({
    recipient_company: '',
    recipient_name: '',
    recipient_email: '',
    purpose: 'for_information',
    project_id: undefined,
    drawings: [],
    cover_letter: '',
    notes: '',
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      loadDrawingsForProject(formData.project_id);
    } else {
      loadAllDrawings();
    }
  }, [formData.project_id]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const [projectsData, drawingsData] = await Promise.all([
        loadProjects(),
        getDrawings({ status: 'issued' }),
      ]);
      setProjects(projectsData);
      setDrawings(drawingsData);
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setLoadingData(false);
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

  const loadDrawingsForProject = async (projectId: string) => {
    const data = await getDrawings({ project_id: projectId, status: 'issued' });
    setDrawings(data);
  };

  const loadAllDrawings = async () => {
    const data = await getDrawings({ status: 'issued' });
    setDrawings(data);
  };

  const handleChange = (
    field: keyof TransmittalFormInput,
    value: string | undefined | TransmittalDrawingItem[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validation = validateTransmittalInput(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      const result = await createTransmittal(formData);
      if (result.success && result.data) {
        toast.success('Transmittal created successfully');
        router.push(`/engineering/drawings/transmittals/${result.data.id}`);
      } else {
        toast.error(result.error || 'Failed to create transmittal');
      }
    } catch (error) {
      console.error('Error creating transmittal:', error);
      toast.error('An error occurred while creating transmittal');
    } finally {
      setLoading(false);
    }
  };

  const purposes: TransmittalPurpose[] = [
    'for_approval',
    'for_construction',
    'for_information',
    'for_review',
    'as_built',
  ];

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" asChild>
        <Link href="/engineering/drawings/transmittals">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Transmittals
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
        {/* Recipient Information */}
        <Card>
          <CardHeader>
            <CardTitle>Recipient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient_company">Company *</Label>
              <Input
                id="recipient_company"
                value={formData.recipient_company}
                onChange={(e) => handleChange('recipient_company', e.target.value)}
                placeholder="Enter recipient company name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient_name">Contact Name</Label>
              <Input
                id="recipient_name"
                value={formData.recipient_name || ''}
                onChange={(e) => handleChange('recipient_name', e.target.value)}
                placeholder="Enter contact name (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient_email">Email</Label>
              <Input
                id="recipient_email"
                type="email"
                value={formData.recipient_email || ''}
                onChange={(e) => handleChange('recipient_email', e.target.value)}
                placeholder="Enter email address (optional)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transmittal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Transmittal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Select
                value={formData.purpose}
                onValueChange={(value) =>
                  handleChange('purpose', value as TransmittalPurpose)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {purposes.map((purpose) => (
                    <SelectItem key={purpose} value={purpose}>
                      {PURPOSE_LABELS[purpose]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project (Filter)</Label>
              <Select
                value={formData.project_id || 'all'}
                onValueChange={(value) =>
                  handleChange('project_id', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover_letter">Cover Letter</Label>
              <Textarea
                id="cover_letter"
                value={formData.cover_letter || ''}
                onChange={(e) => handleChange('cover_letter', e.target.value)}
                placeholder="Enter cover letter text (optional)"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Drawing Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Select Drawings *</CardTitle>
          </CardHeader>
          <CardContent>
            {drawings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No issued drawings available.</p>
                <p className="text-sm mt-1">
                  Only drawings with &quot;Issued&quot; status can be included in transmittals.
                </p>
              </div>
            ) : (
              <DrawingSelector
                drawings={drawings}
                selectedDrawings={formData.drawings}
                onSelectionChange={(items) => handleChange('drawings', items)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" asChild>
          <Link href="/engineering/drawings/transmittals">Cancel</Link>
        </Button>
        <Button type="submit" disabled={loading || drawings.length === 0}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Create Transmittal
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
