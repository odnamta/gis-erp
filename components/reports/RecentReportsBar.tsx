'use client'

import Link from 'next/link'
import { Clock, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface RecentReportItem {
  report_code: string
  report_name: string
  href: string
  executed_at: string
}

interface RecentReportsBarProps {
  /** Server-fetched recent reports data */
  initialData: RecentReportItem[]
}

export function RecentReportsBar({ initialData }: RecentReportsBarProps) {
  if (initialData.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="h-4 w-4" />
        <span>No recently viewed reports</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Recent:</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {initialData.map((report) => (
          <Link key={`${report.report_code}-${report.executed_at}`} href={report.href}>
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors"
            >
              {report.report_name}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(report.executed_at), { addSuffix: true })}
              </span>
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  )
}
