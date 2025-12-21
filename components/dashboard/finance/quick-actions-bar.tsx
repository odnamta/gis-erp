'use client'

import Link from 'next/link'
import {
  CreditCard,
  FileText,
  ClipboardCheck,
  FileBarChart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuickActionsBarProps {
  showRecordPayment?: boolean
  showRecordVendorInvoice?: boolean
  showApproveBKK?: boolean
  showRunARReport?: boolean
}

export function QuickActionsBar({
  showRecordPayment = true,
  showRecordVendorInvoice = true,
  showApproveBKK = true,
  showRunARReport = true,
}: QuickActionsBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {showRecordPayment && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/invoices?action=record-payment">
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </Link>
        </Button>
      )}

      {showRecordVendorInvoice && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/vendor-invoices/new">
            <FileText className="h-4 w-4 mr-2" />
            Record Vendor Invoice
          </Link>
        </Button>
      )}

      {showApproveBKK && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/bkk?status=pending">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Approve BKK
          </Link>
        </Button>
      )}

      {showRunARReport && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports/ar-aging">
            <FileBarChart className="h-4 w-4 mr-2" />
            Run AR Report
          </Link>
        </Button>
      )}
    </div>
  )
}
