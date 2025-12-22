'use client';

// Drawing Status Cards Component
// Displays count cards for each drawing status

import { Card, CardContent } from '@/components/ui/card';
import { DrawingStatus, STATUS_LABELS } from '@/types/drawing';
import { 
  FileEdit, 
  Eye, 
  CheckCircle, 
  FileCheck, 
  Send, 
  Archive 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusCount {
  draft: number;
  for_review: number;
  for_approval: number;
  approved: number;
  issued: number;
  superseded: number;
}

interface DrawingStatusCardsProps {
  counts: StatusCount;
  onStatusClick: (status: DrawingStatus | null) => void;
  selectedStatus: DrawingStatus | null;
}

const STATUS_CONFIG: Record<DrawingStatus, { 
  icon: typeof FileEdit; 
  color: string;
  bgColor: string;
}> = {
  draft: { 
    icon: FileEdit, 
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
  },
  for_review: { 
    icon: Eye, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100',
  },
  for_approval: { 
    icon: CheckCircle, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  approved: { 
    icon: FileCheck, 
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  issued: { 
    icon: Send, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  superseded: { 
    icon: Archive, 
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
};

export function DrawingStatusCards({
  counts,
  onStatusClick,
  selectedStatus,
}: DrawingStatusCardsProps) {
  const statuses: DrawingStatus[] = [
    'draft',
    'for_review',
    'for_approval',
    'approved',
    'issued',
  ];

  const total = statuses.reduce((sum, status) => sum + (counts[status] || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total card */}
      <Card
        className={cn(
          'cursor-pointer transition-all',
          selectedStatus === null
            ? 'ring-2 ring-primary'
            : 'hover:shadow-md'
        )}
        onClick={() => onStatusClick(null)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">All Drawings</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      {statuses.map((status) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const count = counts[status] || 0;

        return (
          <Card
            key={status}
            className={cn(
              'cursor-pointer transition-all',
              config.bgColor,
              selectedStatus === status
                ? 'ring-2 ring-primary'
                : 'hover:shadow-md'
            )}
            onClick={() => onStatusClick(status)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {STATUS_LABELS[status]}
                  </p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <Icon className={cn('h-8 w-8', config.color)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
