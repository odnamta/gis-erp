'use client'

import { FinanceKPICards } from './finance-kpi-cards'
import { ARAgingSummary } from './ar-aging-summary'
import { PJOPipeline } from './pjo-pipeline'
import { OverdueInvoicesTable } from './overdue-invoices-table'
import { RecentPaymentsTable } from './recent-payments-table'
import { ExportReportDropdown } from './export-report-dropdown'
import { PendingBKKTable } from './pending-bkk-table'
import type { 
  FinanceKPIs, 
  ARAgingData, 
  PJOPipelineData, 
  OverdueInvoice, 
  RecentPayment,
  PaymentDashboardStats 
} from '@/lib/finance-dashboard-utils'
import type { BKKWithRelations } from '@/types'

export interface FinanceDashboardData {
  kpis: FinanceKPIs
  arAging: ARAgingData
  pjoPipeline: PJOPipelineData[]
  overdueInvoices: OverdueInvoice[]
  recentPayments: RecentPayment[]
  paymentStats?: PaymentDashboardStats
  pendingBKKs?: BKKWithRelations[]
}

interface FinanceDashboardProps {
  data: FinanceDashboardData
}

export function FinanceDashboard({ data }: FinanceDashboardProps) {
  const handleRemindInvoice = (invoiceId: string) => {
    // TODO: Implement reminder action (future n8n integration)
    console.log('Remind invoice:', invoiceId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="text-muted-foreground">
            Track AR, invoices, and quotation pipeline
          </p>
        </div>
        <ExportReportDropdown 
          arAging={data.arAging} 
          recentPayments={data.recentPayments} 
        />
      </div>

      {/* KPI Cards */}
      <FinanceKPICards kpis={data.kpis} paymentStats={data.paymentStats} />

      {/* AR Aging Summary */}
      <ARAgingSummary aging={data.arAging} />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quotation Pipeline */}
        <PJOPipeline pipeline={data.pjoPipeline} />

        {/* Recent Payments */}
        <RecentPaymentsTable payments={data.recentPayments} />
      </div>

      {/* Pending BKK Approvals */}
      {data.pendingBKKs && data.pendingBKKs.length > 0 && (
        <PendingBKKTable bkks={data.pendingBKKs} />
      )}

      {/* Overdue Invoices - Full Width */}
      <OverdueInvoicesTable 
        invoices={data.overdueInvoices} 
        onRemind={handleRemindInvoice}
      />
    </div>
  )
}
