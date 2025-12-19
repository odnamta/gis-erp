'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BKKList } from './bkk-list'
import { BKKSummary } from './bkk-summary'
import { calculateBKKSummary } from '@/lib/bkk-utils'
import type { BKKWithRelations } from '@/types/database'
import { Plus, Banknote } from 'lucide-react'

interface BKKSectionProps {
  jobOrderId: string
  bkks: BKKWithRelations[]
  userRole: string
  currentUserId?: string
  canRequest?: boolean
}

export function BKKSection({ 
  jobOrderId, 
  bkks, 
  userRole, 
  currentUserId,
  canRequest = true 
}: BKKSectionProps) {
  const summary = calculateBKKSummary(bkks)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Cash Disbursements (BKK)
        </CardTitle>
        {canRequest && (
          <Button asChild size="sm">
            <Link href={`/job-orders/${jobOrderId}/bkk/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Request BKK
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <BKKList 
          bkks={bkks} 
          jobOrderId={jobOrderId}
          userRole={userRole}
          currentUserId={currentUserId}
        />
        
        {bkks.length > 0 && (
          <BKKSummary summary={summary} />
        )}
      </CardContent>
    </Card>
  )
}
