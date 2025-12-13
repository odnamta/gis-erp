import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function JOPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Orders</h2>
          <p className="text-muted-foreground">Manage active job orders</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Job Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Job Orders</CardTitle>
          <CardDescription>View and manage all job orders</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No job orders found. Create your first job order to get started.</p>
        </CardContent>
      </Card>
    </div>
  )
}
