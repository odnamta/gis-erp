'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingStatistics } from '@/types/training';
import { CheckCircle, AlertTriangle, XCircle, Users } from 'lucide-react';

interface ComplianceSummaryCardsProps {
  statistics: TrainingStatistics;
}

export function ComplianceSummaryCards({ statistics }: ComplianceSummaryCardsProps) {
  const cards = [
    {
      title: 'Kepatuhan Keseluruhan',
      value: `${statistics.overallCompliancePercentage.toFixed(1)}%`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: `${statistics.totalEmployees} karyawan`,
    },
    {
      title: 'Sepenuhnya Patuh',
      value: statistics.fullyCompliantCount.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Semua pelatihan valid',
    },
    {
      title: 'Segera Kadaluarsa',
      value: statistics.expiringWithin30Days.toString(),
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'Dalam 30 hari',
    },
    {
      title: 'Tidak Patuh',
      value: statistics.nonCompliantCount.toString(),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Perlu perhatian',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
