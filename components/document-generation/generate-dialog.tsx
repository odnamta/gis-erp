'use client'

import { useState, useEffect } from 'react'
import {
  DocumentTemplate,
  DocumentType,
  GenerationResult,
} from '@/types/document-generation'
import { listActiveTemplates } from '@/lib/document-template-actions'
import {
  generateInvoice,
  generateQuotation,
  generateDeliveryNote,
} from '@/lib/document-generator-actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  FileText,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Receipt,
  Truck,
} from 'lucide-react'

// Document type labels
const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  contract: 'Contract',
  certificate: 'Certificate',
  report: 'Report',
  packing_list: 'Packing List',
  delivery_note: 'Delivery Note',
}

// Document type icons
const DOCUMENT_TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  invoice: <Receipt className="h-4 w-4" />,
  quotation: <FileSpreadsheet className="h-4 w-4" />,
  contract: <FileText className="h-4 w-4" />,
  certificate: <FileText className="h-4 w-4" />,
  report: <FileText className="h-4 w-4" />,
  packing_list: <FileText className="h-4 w-4" />,
  delivery_note: <Truck className="h-4 w-4" />,
}

interface GenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: 'invoice' | 'quotation' | 'job_order'
  entityId: string
  entityNumber?: string
  userId: string
  onSuccess?: (result: GenerationResult) => void
}

type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export function GenerateDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityNumber,
  userId,
  onSuccess,
}: GenerateDialogProps) {
  const { toast } = useToast()

  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Map entity type to document type
  const documentType: DocumentType = entityType === 'job_order' ? 'delivery_note' : entityType

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates()
      // Reset state
      setStatus('idle')
      setResult(null)
      setError(null)
    }
  }, [open, documentType])

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    const result = await listActiveTemplates(documentType)
    if (result.success && result.data) {
      setTemplates(result.data)
      // Auto-select first template if available
      if (result.data.length > 0) {
        setSelectedTemplateId(result.data[0].id)
      }
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load templates',
        variant: 'destructive',
      })
    }
    setIsLoadingTemplates(false)
  }

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast({
        title: 'Error',
        description: 'Please select a template',
        variant: 'destructive',
      })
      return
    }

    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
    if (!selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Selected template not found',
        variant: 'destructive',
      })
      return
    }

    setStatus('loading')
    setError(null)

    let generationResult: GenerationResult

    try {
      switch (entityType) {
        case 'invoice':
          generationResult = await generateInvoice(
            entityId,
            userId,
            selectedTemplate.template_code
          )
          break
        case 'quotation':
          generationResult = await generateQuotation(
            entityId,
            userId,
            selectedTemplate.template_code
          )
          break
        case 'job_order':
          generationResult = await generateDeliveryNote(
            entityId,
            userId,
            selectedTemplate.template_code
          )
          break
        default:
          throw new Error(`Unsupported entity type: ${entityType}`)
      }

      if (generationResult.success) {
        setStatus('success')
        setResult(generationResult)
        toast({
          title: 'Success',
          description: 'Document generated successfully',
        })
        onSuccess?.(generationResult)
      } else {
        setStatus('error')
        setError(generationResult.error || 'Generation failed')
        toast({
          title: 'Error',
          description: generationResult.error || 'Failed to generate document',
          variant: 'destructive',
        })
      }
    } catch (err) {
      setStatus('error')
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleDownload = () => {
    if (result?.file_url) {
      window.open(result.file_url, '_blank')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after close animation
    setTimeout(() => {
      setStatus('idle')
      setResult(null)
      setError(null)
    }, 200)
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {DOCUMENT_TYPE_ICONS[documentType]}
            Generate {DOCUMENT_TYPE_LABELS[documentType]}
          </DialogTitle>
          <DialogDescription>
            {entityNumber
              ? `Generate a PDF document for ${entityNumber}`
              : `Generate a PDF document for this ${entityType.replace('_', ' ')}`}
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' || status === 'loading' ? (
          <>
            <div className="space-y-4 py-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template">Select Template</Label>
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No active templates found for {DOCUMENT_TYPE_LABELS[documentType]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a template in Settings → Document Templates
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{template.template_name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              ({template.template_code})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Template Preview Info */}
              {selectedTemplate && (
                <div className="space-y-2">
                  <Separator />
                  <div className="text-sm">
                    <Label className="text-muted-foreground">Template Details</Label>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Page Size:</span>
                        <span>{selectedTemplate.page_size}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Orientation:</span>
                        <span className="capitalize">{selectedTemplate.orientation}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Letterhead:</span>
                        <Badge variant={selectedTemplate.include_letterhead ? 'default' : 'secondary'}>
                          {selectedTemplate.include_letterhead ? 'Included' : 'Not included'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={status === 'loading' || !selectedTemplateId || templates.length === 0}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate PDF
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : status === 'success' ? (
          <>
            <div className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Document Generated!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your {DOCUMENT_TYPE_LABELS[documentType]} has been generated successfully.
              </p>
              {result?.document && (
                <div className="text-sm text-muted-foreground">
                  <p>File: {result.document.file_name}</p>
                  <p>Size: {result.document.file_size_kb} KB</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Close
              </Button>
              <Button onClick={handleDownload} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {result?.file_url && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(result.file_url, '_blank')}
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Generation Failed</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error || 'An error occurred while generating the document.'}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setStatus('idle')}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
