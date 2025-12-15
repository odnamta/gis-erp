'use client'

import { useRouter } from 'next/navigation'
import { FileText, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/format'
import type { PJOPipelineData } from '@/lib/finance-dashboard-utils'

interface PJOPipelineProps {
  pipeline: PJOPipelineData[]
}

const statusConfig = {
  draft: { 
    icon: FileText, 
    label: 'Draft', 
    emoji: '📝',
    action: 'Review',
    color: 'text-gray-600'
  },
  pending_approval: { 
    icon: Clock, 
    label: 'Pending Approval', 
    emoji: '⏳',
    action: 'Follow up',
    color: 'text-yellow-600'
  },
  approved: { 
    icon: CheckCircle, 
    label: 'Approved', 
    emoji: '✅',
    action: 'Track execution',
    color: 'text-green-600'
  },
  rejected: { 
    icon: XCircle, 
    label: 'Rejected', 
    emoji: '❌',
    action: 'Archive',
    color: 'text-red-600'
  },
}

export function PJOPipeline({ pipeline }: PJOPipelineProps) {
  const router = useRouter()

  const handleAction = (status: string) => {
    if (status === 'approved') {
      router.push('/job-orders')
    } else {
      router.push(`/pjo?status=${status}`)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Quotation Pipeline (PJOs)</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => router.push('/pjo')}>
          View All <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
            <div>Status</div>
            <div className="text-center">Count</div>
            <div className="text-right">Total Value</div>
            <div className="text-right">Action</div>
          </div>
          
          {/* Rows */}
          {pipeline.map((item) => {
            const config = statusConfig[item.status]
            
            return (
              <div 
                key={item.status} 
                className="grid grid-cols-4 gap-4 items-center py-2 hover:bg-muted/50 rounded-md px-1"
              >
                <div className="flex items-center gap-2">
                  <span>{config.emoji}</span>
                  <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="text-center font-medium">
                  {item.count}
                </div>
                <div className="text-right font-medium">
                  {formatCurrency(item.totalValue)}
                </div>
                <div className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleAction(item.status)}
                    disabled={item.count === 0}
                  >
                    {config.action}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
