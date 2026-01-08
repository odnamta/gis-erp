import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CustomerAcquisitionClient } from './customer-acquisition-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildCustomerAcquisitionReport, CustomerAcquisitionReport } from '@/lib/reports/customer-acquisition-utils'
import { startOfYear, endOfYear } from 'date-fns'

export const metadata = {
  title: 'Customer Acquisition | Gama ERP',
  description: 'New customer trends and revenue analysis',
}

async function fetchReportData(): Promise<CustomerAcquisitionReport | null> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now)
  const endDate = endOfYear(now)

  const { data: customerData, error } = await supabase
    .from('customers')
    .select(`
      id,
      name,
      created_at,
      projects (
        name,
        created_at,
        proforma_job_orders (
          job_orders (final_revenue)
        )
      )
    `)

  if (error) {
    console.error('Error fetching customer data:', error)
    return null
  }

  type CustomerRow = {
    id: string
    name: string
    created_at: string | null
    projects?: Array<{
      name: string
      created_at: string | null
      proforma_job_orders?: Array<{
        job_orders?: { final_revenue: number | null } | null
      }>
    }>
  }

  const customers = ((customerData || []) as unknown as CustomerRow[]).map(customer => {
    const projects = customer.projects || []
    const firstProject = projects.sort((a, b) =>
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    )[0]

    const totalRevenue = projects.reduce((sum: number, project) => {
      const pjos = project.proforma_job_orders || []
      return sum + pjos.reduce((pjoSum: number, pjo) => {
        const jo = pjo.job_orders
        return pjoSum + (jo?.final_revenue || 0)
      }, 0)
    }, 0)

    return {
      customerId: customer.id,
      customerName: customer.name,
      createdAt: new Date(customer.created_at || new Date()),
      firstProjectName: firstProject?.name || null,
      totalRevenue,
    }
  })

  return buildCustomerAcquisitionReport(customers, { startDate, endDate })
}

async function CustomerAcquisitionContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'customer-acquisition')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back to Reports</Link>
          </Button>
        </div>
        <ReportEmptyState title="Access Denied" message="You don't have permission to view this report." />
      </div>
    )
  }

  const initialData = await fetchReportData()

  return <CustomerAcquisitionClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function CustomerAcquisitionPage() {
  return (
    <Suspense fallback={<ReportSkeleton columns={4} summaryCards={3} />}>
      <CustomerAcquisitionContent />
    </Suspense>
  )
}
