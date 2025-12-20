'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, Wallet, Building2 } from 'lucide-react';
import { formatPayrollCurrency, formatPayrollCurrencyCompact } from '@/lib/payroll-utils';

interface PayrollSummaryCardsProps {
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalCompanyCost: number;
  employeeCount?: number;
  compact?: boolean;
}

export function PayrollSummaryCards({
  totalGross,
  totalDeductions,
  totalNet,
  totalCompanyCost,
  employeeCount,
  compact = false,
}: PayrollSummaryCardsProps) {
  const formatAmount = compact ? formatPayrollCurrencyCompact : formatPayrollCurrency;

  const cards = [
    {
      title: 'Total Gross',
      value: formatAmount(totalGross),
      icon: DollarSign,
      description: employeeCount ? `${employeeCount} employees` : undefined,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Deductions',
      value: formatAmount(totalDeductions),
      icon: TrendingDown,
      description: 'BPJS + PPh 21',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Total Net',
      value: formatAmount(totalNet),
      icon: Wallet,
      description: 'Take-home pay',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Company Cost',
      value: formatAmount(totalCompanyCost),
      icon: Building2,
      description: 'Gross + benefits',
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
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            {card.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
