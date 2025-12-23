'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, FileText, CheckCircle, Truck, XCircle, Clock } from 'lucide-react';

interface BookingSummaryCardsProps {
  stats: {
    total: number;
    draft: number;
    requested: number;
    confirmed: number;
    shipped: number;
    completed: number;
    cancelled: number;
  };
}

export function BookingSummaryCards({ stats }: BookingSummaryCardsProps) {
  const cards = [
    {
      title: 'Total Bookings',
      value: stats.total,
      icon: Ship,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Draft',
      value: stats.draft,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    {
      title: 'Requested',
      value: stats.requested,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Confirmed',
      value: stats.confirmed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Shipped',
      value: stats.shipped,
      icon: Truck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
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
