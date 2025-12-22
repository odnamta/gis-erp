'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Search, ShieldAlert, Bandage, Calendar } from 'lucide-react';
import { IncidentDashboardSummary } from '@/types/incident';

interface IncidentSummaryCardsProps {
  summary: IncidentDashboardSummary;
}

export function IncidentSummaryCards({ summary }: IncidentSummaryCardsProps) {
  const cards = [
    {
      title: 'Insiden Terbuka',
      value: summary.openIncidents,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Dalam Investigasi',
      value: summary.underInvestigation,
      icon: Search,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Near Miss (MTD)',
      value: summary.nearMissesMTD,
      icon: ShieldAlert,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Cedera (MTD)',
      value: summary.injuriesMTD,
      icon: Bandage,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Hari Tanpa LTI',
      value: summary.daysSinceLastLTI,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
