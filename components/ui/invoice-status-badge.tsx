import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { InvoiceStatus } from '@/types'

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
  },
}

interface InvoiceStatusBadgeProps {
  status: string
  className?: string
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status as InvoiceStatus] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  }

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
