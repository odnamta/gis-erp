'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, FileCheck, Truck, Receipt, DollarSign, FolderPlus } from 'lucide-react'
import { type AdminKPIs } from '@/lib/admin-dashboard-utils'
import { formatCurrency } from '@/lib/pjo-utils'

interface AdminKPICardsProps {
  kpis: AdminKPIs
  isLoading?: boolean
}

export function AdminKPICards({ kpis, isLoading }: AdminKPICardsProps) {
  const cards = [
    {
      title: 'PJOs Pending Approval',
      value: kpis.pjosPendingApproval,
      icon: FileText,
      format: 'number',
      color: kpis.pjosPendingApproval > 0 ? 'text-amber-600' : 'text-muted-foreground',
    },
    {
      title: 'Ready for JO',
      value: kpis.pjosReadyForJO,
      icon: FileCheck,
      format: 'number',
      color: kpis.pjosReadyForJO > 0 ? 'text-blue-600' : 'text-muted-foreground',
    },
    {
      title: 'JOs In Progress',
      value: kpis.josInProgress,
      icon: Truck,
      format: 'number',
      color: 'text-muted-foreground',
    },
    {
      title: 'Invoices Unpaid',
      value: kpis.invoicesUnpaid,
      icon: Receipt,
      format: 'number',
      color: kpis.invoicesUnpaid > 5 ? 'text-red-600' : 'text-muted-foreground',
    },
    {
      title: 'Revenue This Period',
      value: kpis.revenueThisPeriod,
      icon: DollarSign,
      format: 'currency',
      color: 'text-green-600',
    },
    {
      title: 'Docs Created',
      value: kpis.documentsCreated,
      icon: FolderPlus,
      format: 'number',
      color: 'text-muted-foreground',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.format === 'currency'
                ? formatCurrency(card.value)
                : card.value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
