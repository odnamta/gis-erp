'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { type PipelineStage } from '@/lib/admin-dashboard-utils'

interface PJOStatusPipelineProps {
  stages: PipelineStage[]
  isLoading?: boolean
}

const STAGE_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  pending_approval: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  approved: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  converted: 'bg-green-100 text-green-700 hover:bg-green-200',
}

export function PJOStatusPipeline({ stages, isLoading }: PJOStatusPipelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PJO Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-16 w-32 rounded-lg" />
                {i < 3 && <Skeleton className="h-4 w-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PJO Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {stages.map((stage, index) => (
            <div key={stage.status} className="flex items-center gap-2">
              <Link
                href={`/pjo?status=${stage.status === 'converted' ? 'approved&converted=true' : stage.status}`}
                className={`flex flex-col items-center justify-center rounded-lg px-4 py-3 transition-colors ${STAGE_COLORS[stage.status] || 'bg-gray-100'}`}
              >
                <span className="text-2xl font-bold">{stage.count}</span>
                <span className="text-xs font-medium">{stage.label}</span>
                <span className="text-xs opacity-70">
                  {stage.percentage.toFixed(0)}%
                </span>
              </Link>
              {index < stages.length - 1 && (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
