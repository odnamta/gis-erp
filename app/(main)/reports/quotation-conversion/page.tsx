import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { QuotationConversionClient } from './quotation-conversion-client'
import { ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { getUserProfile } from '@/lib/permissions-server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { buildQuotationConversionReportData } from '@/lib/reports/quotation-utils'
import { startOfYear, endOfYear } from 'date-fns'
import { QuotationConversionReportData } from '@/types/reports'

export const metadata = {
  title: 'Quotation Conversion Report | Gama ERP',
  description: 'PJO conversion and pipeline analysis',
}

async function fetchReportData(): Promise<QuotationConversionReportData | null> {
  const supabase = await createClient()
  const now = new Date()
  const startDate = startOfYear(now).toISOString().split('T')[0]
  const endDate = endOfYear(now).toISOString().split('T')[0]

  const { data: pjos, error } = await supabase
    .from('proforma_job_orders')
    .select(`
      id,
      status,
      converted_to_jo,
      created_at,
      approved_at,
      converted_to_jo_at
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching quotation conversion data:', error)
    return null
  }

  return buildQuotationConversionReportData(pjos || [], { startDate: new Date(startDate), endDate: new Date(endDate) })
}

async function QuotationConversionContent() {
  const profile = await getUserProfile()

  if (profile && !canAccessReport(profile.role, 'quotation-conversion')) {
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

  return <QuotationConversionClient initialData={initialData} userId={profile?.user_id ?? undefined} />
}

export default function QuotationConversionPage() {
  return (
    <Suspense fallback={<ReportSkeleton summaryCards={2} />}>
      <QuotationConversionContent />
    </Suspense>
  )
}
