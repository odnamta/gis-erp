'use client';

// components/assessments/assessment-status-cards.tsx
// Status count cards for Technical Assessments module (v0.58)

import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle
} from 'lucide-react';

interface AssessmentStatusCardsProps {
  counts: {
    draft: number;
    in_progress: number;
    pending_review: number;
    approved: number;
    rejected: number;
    superseded: number;
    total: number;
  };
  onStatusClick?: (status: string | null) => void;
  selectedStatus?: string | null;
}

export function AssessmentStatusCards({ 
  counts, 
  onStatusClick,
  selectedStatus 
}: AssessmentStatusCardsProps) {
  const statusCards = [
    {
      key: null,
      label: 'Total',
      count: counts.total,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
    {
      key: 'draft',
      label: 'Draft',
      count: counts.draft,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      count: counts.in_progress,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      key: 'pending_review',
      label: 'Pending Review',
      count: counts.pending_review,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    {
      key: 'approved',
      label: 'Approved',
      count: counts.approved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      count: counts.rejected,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statusCards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedStatus === card.key;
        
        return (
          <Card
            key={card.key || 'total'}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? `ring-2 ring-offset-2 ${card.borderColor}` : ''
            }`}
            onClick={() => onStatusClick?.(card.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {card.count}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
