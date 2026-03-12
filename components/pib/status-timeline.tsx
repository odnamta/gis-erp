'use client'

import { PIBStatus } from '@/types/pib'
import { formatPIBStatus } from '@/lib/pib-utils'
import { Check, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusTimelineProps {
  currentStatus: PIBStatus
}

// Define the main workflow statuses (excluding cancelled)
const WORKFLOW_STATUSES: PIBStatus[] = [
  'draft',
  'submitted',
  'document_check',
  'physical_check',
  'duties_paid',
  'released',
  'completed',
]

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = WORKFLOW_STATUSES.indexOf(currentStatus)
  const isCancelled = currentStatus === 'cancelled'

  return (
    <div className="w-full">
      {isCancelled ? (
        <div className="flex items-center justify-center rounded-md bg-red-50 border border-red-200 p-4">
          <span className="text-red-700 font-medium">Document Cancelled</span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {WORKFLOW_STATUSES.map((status, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div key={status} className="flex flex-1 items-center">
                {/* Status Node */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                      isCompleted && 'border-green-500 bg-green-500 text-white',
                      isCurrent && 'border-blue-500 bg-blue-500 text-white',
                      isPending && 'border-gray-300 bg-white text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-xs text-center max-w-[80px]',
                      isCompleted && 'text-green-700 font-medium',
                      isCurrent && 'text-blue-700 font-medium',
                      isPending && 'text-gray-400'
                    )}
                  >
                    {formatPIBStatus(status)}
                  </span>
                </div>

                {/* Connector Line */}
                {index < WORKFLOW_STATUSES.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
