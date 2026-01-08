import { getJobOrders } from './actions'
import { JOVirtualTable } from '@/components/job-orders/jo-virtual-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function JobOrdersPage() {
  const jobOrders = await getJobOrders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Orders</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Job Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <JOVirtualTable jobOrders={jobOrders} />
        </CardContent>
      </Card>
    </div>
  )
}
