'use client'

import { Button } from '@/components/ui/button'
import { Eye, Download, Loader2, FileText } from 'lucide-react'
import { useState } from 'react'
import { GenerateDialog } from '@/components/document-generation/generate-dialog'
import { useToast } from '@/hooks/use-toast'

export type PDFDocumentType = 'invoice' | 'surat-jalan' | 'berita-acara' | 'quotation' | 'job_order' | 'pjo' | 'bkk' | 'job-order'

interface PDFButtonsProps {
  documentType: PDFDocumentType
  documentId: string
  documentNumber?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost'
  showLabels?: boolean
  userId?: string
  showGenerateButton?: boolean
}

export function PDFButtons({
  documentType,
  documentId,
  documentNumber,
  size = 'sm',
  variant = 'outline',
  showLabels = true,
  userId,
  showGenerateButton = false,
}: PDFButtonsProps) {
  const { toast } = useToast()
  const [isViewing, setIsViewing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)

  // Map document types for the generation dialog
  const getEntityType = (): 'invoice' | 'quotation' | 'job_order' | null => {
    switch (documentType) {
      case 'invoice':
        return 'invoice'
      case 'quotation':
        return 'quotation'
      case 'job_order':
        return 'job_order'
      default:
        return null
    }
  }

  const entityType = getEntityType()

  const getPDFUrl = (download: boolean) => {
    const baseUrl = `/api/pdf/${documentType}/${documentId}`
    return download ? `${baseUrl}?download=true` : baseUrl
  }

  const handleView = async () => {
    setIsViewing(true)
    try {
      const response = await fetch(getPDFUrl(false), { method: 'HEAD' })
      if (!response.ok) {
        toast({
          title: 'PDF belum tersedia',
          description: 'Gunakan tombol "Generate PDF" untuk membuat dokumen terlebih dahulu.',
          variant: 'destructive',
        })
        return
      }
      window.open(getPDFUrl(false), '_blank')
    } catch {
      toast({
        title: 'PDF belum tersedia',
        description: 'Gunakan tombol "Generate PDF" untuk membuat dokumen terlebih dahulu.',
        variant: 'destructive',
      })
    } finally {
      setIsViewing(false)
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(getPDFUrl(true))
      if (!response.ok) {
        toast({
          title: 'Download gagal',
          description: 'PDF belum tersedia. Gunakan tombol "Generate PDF" terlebih dahulu.',
          variant: 'destructive',
        })
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = documentNumber ? `${documentNumber}.pdf` : `${documentType}-${documentId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      toast({
        title: 'Download gagal',
        description: 'Terjadi kesalahan saat mengunduh PDF.',
        variant: 'destructive',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex gap-2">
      {showGenerateButton && entityType && userId && (
        <>
          <Button
            variant={variant}
            size={size}
            onClick={() => setGenerateDialogOpen(true)}
          >
            <FileText className="h-4 w-4" />
            {showLabels && <span className="ml-2">Generate PDF</span>}
          </Button>
          <GenerateDialog
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
            entityType={entityType}
            entityId={documentId}
            entityNumber={documentNumber}
            userId={userId}
          />
        </>
      )}
      <Button
        variant={variant}
        size={size}
        onClick={handleView}
        disabled={isViewing}
      >
        {isViewing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        {showLabels && <span className="ml-2">View PDF</span>}
      </Button>
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {showLabels && <span className="ml-2">Download</span>}
      </Button>
    </div>
  )
}

// Compact version for table rows
interface PDFIconButtonsProps {
  documentType: PDFDocumentType
  documentId: string
  documentNumber?: string
}

export function PDFIconButtons({
  documentType,
  documentId,
  documentNumber,
}: PDFIconButtonsProps) {
  return (
    <PDFButtons
      documentType={documentType}
      documentId={documentId}
      documentNumber={documentNumber}
      size="icon"
      variant="ghost"
      showLabels={false}
    />
  )
}
