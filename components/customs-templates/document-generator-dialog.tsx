'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Eye, Loader2 } from 'lucide-react';
import type { CustomsDocumentTemplate, PlaceholderDefinition } from '@/types/customs-templates';
import { DOCUMENT_TYPE_LABELS } from '@/types/customs-templates';
import { generateDocument, resolveTemplateData, generatePreviewHtml } from '@/lib/template-actions';
import { DocumentDataForm } from './document-data-form';
import { toast } from 'sonner';

interface DocumentGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: CustomsDocumentTemplate[];
  pibOptions?: { id: string; label: string }[];
  pebOptions?: { id: string; label: string }[];
  defaultPibId?: string;
  defaultPebId?: string;
}

export function DocumentGeneratorDialog({
  open,
  onOpenChange,
  templates,
  pibOptions = [],
  pebOptions = [],
  defaultPibId,
  defaultPebId,
}: DocumentGeneratorDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [activeTab, setActiveTab] = useState('data');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPibId, setSelectedPibId] = useState<string>(defaultPibId || '');
  const [selectedPebId, setSelectedPebId] = useState<string>(defaultPebId || '');
  const [documentData, setDocumentData] = useState<Record<string, unknown>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTemplateId('');
      setSelectedPibId(defaultPibId || '');
      setSelectedPebId(defaultPebId || '');
      setDocumentData({});
      setPreviewHtml('');
      setActiveTab('data');
    }
  }, [open, defaultPibId, defaultPebId]);

  // Resolve data when template or source changes
  useEffect(() => {
    const resolveData = async () => {
      if (!selectedTemplateId) return;

      setResolving(true);
      try {
        const result = await resolveTemplateData(
          selectedTemplateId,
          selectedPibId || undefined,
          selectedPebId || undefined
        );
        if (!result.error) {
          setDocumentData(result.data);
        }
      } catch (error) {
        console.error('Error resolving data:', error);
      } finally {
        setResolving(false);
      }
    };

    resolveData();
  }, [selectedTemplateId, selectedPibId, selectedPebId]);

  // Generate preview when switching to preview tab
  useEffect(() => {
    const generatePreview = async () => {
      if (activeTab !== 'preview' || !selectedTemplateId) return;

      try {
        const result = await generatePreviewHtml(selectedTemplateId, documentData);
        if (!result.error) {
          setPreviewHtml(result.html);
        }
      } catch (error) {
        console.error('Error generating preview:', error);
      }
    };

    generatePreview();
  }, [activeTab, selectedTemplateId, documentData]);

  const handleDataChange = (key: string, value: unknown) => {
    setDocumentData((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    setLoading(true);
    try {
      const result = await generateDocument({
        template_id: selectedTemplateId,
        pib_id: selectedPibId || undefined,
        peb_id: selectedPebId || undefined,
        document_data: documentData,
      });

      if (result.success) {
        toast.success('Document generated successfully');
        onOpenChange(false);
        router.push('/customs/documents');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to generate document');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template *</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name} ({DOCUMENT_TYPE_LABELS[template.document_type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source Selection */}
          <div className="grid grid-cols-2 gap-4">
            {pibOptions.length > 0 && (
              <div className="space-y-2">
                <Label>PIB Source</Label>
                <Select value={selectedPibId || '__none__'} onValueChange={(v) => setSelectedPibId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PIB..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {pibOptions.map((pib) => (
                      <SelectItem key={pib.id} value={pib.id}>
                        {pib.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pebOptions.length > 0 && (
              <div className="space-y-2">
                <Label>PEB Source</Label>
                <Select value={selectedPebId || '__none__'} onValueChange={(v) => setSelectedPebId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PEB..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {pebOptions.map((peb) => (
                      <SelectItem key={peb.id} value={peb.id}>
                        {peb.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Data & Preview Tabs */}
          {selectedTemplate && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="data">Document Data</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="mt-4">
                {resolving ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading data...</span>
                  </div>
                ) : (
                  <DocumentDataForm
                    placeholders={selectedTemplate.placeholders}
                    data={documentData}
                    onChange={handleDataChange}
                  />
                )}
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-lg p-4 bg-white min-h-[300px]">
                  {previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[400px] border-0"
                      title="Document Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Generating preview...
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !selectedTemplateId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Document'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
