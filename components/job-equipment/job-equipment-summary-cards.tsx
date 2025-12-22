'use client';

// =====================================================
// v0.45: Job Equipment Summary Cards Component
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Calendar, Gauge, Banknote } from 'lucide-react';
import { JobEquipmentSummary } from '@/types/job-equipment';
import { formatEquipmentCurrency } from '@/lib/job-equipment-utils';

interface JobEquipmentSummaryCardsProps {
  summary: JobEquipmentSummary;
}

export function JobEquipmentSummaryCards({
  summary,
}: JobEquipmentSummaryCardsProps) {
  const { equipmentCount, totalEquipmentDays, totalKm, totalEquipmentCost } = summary;
  const cards = [
    {
      title: 'Total Equipment',
      value: equipmentCount.toString(),
      subtitle: 'unit',
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Hari',
      value: totalEquipmentDays.toString(),
      subtitle: 'hari penggunaan',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total KM',
      value: totalKm.toLocaleString('id-ID'),
      subtitle: 'kilometer',
      icon: Gauge,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Total Biaya',
      value: formatEquipmentCurrency(totalEquipmentCost),
      subtitle: 'biaya equipment',
      icon: Banknote,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-full p-2 ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
