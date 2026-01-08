'use client'

import { useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExportColumn, ExportMetadata } from '@/lib/reports/export-utils'
import { DateRange } from '@/types/reports'
import { useToast } from '@/hooks/use-toast'

interface ExportButtonsProps {
  reportTitle: string
  data: Record<string, unknown>[]
  columns: ExportColumn[]
  period?: DateRange
  summary?: { label: string; value: string | number }[]
  userName?: string
}

export function ExportButtons({
  reportTitle,
  data,
  columns,
  period,
  summary,
  userName = 'User',
}: ExportButtonsProps) {
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  const handleExcelExport = async () => {
    setExporting(true)
    try {
      // Dynamic import - only loads ExcelJS when user clicks Export
      const { downloadExcelReport } = await import('@/lib/reports/export-utils')
      
      const metadata: ExportMetadata = {
        generatedAt: new Date(),
        generatedBy: userName,
        reportTitle,
        period,
      }

      await downloadExcelReport({
        reportTitle,
        columns,
        data,
        metadata,
        summary,
      })

      toast({
        title: 'Export successful',
        description: `${reportTitle} exported to Excel`,
      })
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: 'Export failed',
        description: 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExcelExport}
        disabled={exporting || data.length === 0}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 mr-2" />
        )}
        Export Excel
      </Button>
    </div>
  )
}
