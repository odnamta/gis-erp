'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportFilters, ReportSummary, ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { usePermissions } from '@/components/providers/permission-provider'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { buildCustomerAcquisitionReport, CustomerAcquisitionReport } from '@/lib/reports/customer-acquisition-utils'
import { getDateRangeForPreset, parseDateRangeFromParams, formatCurrency, formatDate, formatPercentage } from '@/lib/reports/report-utils'
import { createClient } from '@/lib/supabase/client'
import { DateRange } from '@/types/reports'

export default function CustomerAcquisitionReportPage() {
  const { profile } = usePermissions()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<CustomerAcquisitionReport | null>(null)

  const fetchReportData = useCallback(async (range: DateRange) => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const startDate = format(range.startDate, 'yyyy-MM-dd')
      const endDate = format(range.endDate, 'yyyy-MM-dd')

      // Get all customers with their first project and total revenue
      const { data: customerData, error: customerError } = await supabase
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

      if (customerError) throw customerError

      const customers = ((customerData || []) as any[]).map(customer => {
        const projects = customer.projects || []
        const firstProject = projects.sort((a: any, b: any) => 
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        )[0]
        
        const totalRevenue = projects.reduce((sum: number, project: any) => {
          const pjos = project.proforma_job_orders || []
          return sum + pjos.reduce((pjoSum: number, pjo: any) => {
            const jos = pjo.job_orders || []
            return pjoSum + jos.reduce((joSum: number, jo: any) => joSum + (jo.final_revenue || 0), 0)
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

      const report = buildCustomerAcquisitionReport(customers, range)
      setReportData(report)
    } catch (err) {
      console.error('Error fetching customer acquisition data:', err)
      setError('Failed to load report data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const fromParams = parseDateRangeFromParams(searchParams)
    const range = fromParams || getDateRangeForPreset('this-month')
    fetchReportData(range)
  }, [searchParams, fetchReportData])

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

  const handlePeriodChange = (range: DateRange) => fetchReportData(range)
  const handleCustomerClick = (customerId: string) => router.push(`/customers/${customerId}`)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Customer Acquisition</h1>
            <p className="text-muted-foreground">New customer trends and revenue analysis</p>
          </div>
        </div>
      </div>

      <ReportFilters defaultPeriod="this-month" onPeriodChange={handlePeriodChange} />

      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <ReportEmptyState title="Error" message={error} />
      ) : !reportData || reportData.items.length === 0 ? (
        <ReportEmptyState message="No new customers acquired in the selected period." />
      ) : (
        <>
          <ReportSummary
            items={[
              { label: 'New Customers', value: reportData.totalNewCustomers, format: 'number', highlight: 'positive' },
              { label: 'Avg Revenue', value: reportData.averageRevenuePerCustomer, format: 'currency' },
              ...(reportData.acquisitionTrend !== null ? [{ label: 'vs Previous', value: reportData.acquisitionTrend, format: 'percentage' as const, highlight: reportData.acquisitionTrend >= 0 ? 'positive' as const : 'negative' as const }] : []),
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                New Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Acquisition Date</TableHead>
                    <TableHead>First Project</TableHead>
                    <TableHead className="text-right">Revenue to Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.items.map((item) => (
                    <TableRow key={item.customerId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleCustomerClick(item.customerId)}>
                      <TableCell className="font-medium">{item.customerName}</TableCell>
                      <TableCell>{formatDate(item.acquisitionDate)}</TableCell>
                      <TableCell>{item.firstProject || <span className="text-muted-foreground">No projects</span>}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.totalRevenueToDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
