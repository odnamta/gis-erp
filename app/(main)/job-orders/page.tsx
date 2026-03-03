import { getJobOrders } from './actions'
import { JOVirtualTable } from '@/components/job-orders/jo-virtual-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserProfile } from '@/lib/permissions-server'
import { guardPage } from '@/lib/auth-utils'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'

export default async function JobOrdersPage() {
  const [jobOrders, profile] = await Promise.all([
    getJobOrders(),
    getUserProfile(),
  ])
  const { explorerReadOnly } = await guardPage(!!profile)

  return (
    <div className="space-y-6">
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Orders</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Job Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <JOVirtualTable jobOrders={jobOrders} userRole={profile?.role} />
        </CardContent>
      </Card>
    </div>
  )
}
