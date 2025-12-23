'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Send, CheckCircle, Unlock, Flag, Edit } from 'lucide-react';

export interface BLStats {
  total: number;
  draft: number;
  submitted: number;
  issued: number;
  released: number;
  surrendered: number;
  amended: number;
}

interface BLSummaryCardsProps {
  stats: BLStats;
}

export function BLSummaryCards({ stats }: BLSummaryCardsProps) {
  const cards = [
    {
      title: 'Total B/Ls',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Draft',
      value: stats.draft,
      icon: Edit,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    {
      title: 'Submitted',
      value: stats.submitted,
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Issued',
      value: stats.issued,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Released',
      value: stats.released,
      icon: Unlock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Surrendered',
      value: stats.surrendered,
      icon: Flag,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
