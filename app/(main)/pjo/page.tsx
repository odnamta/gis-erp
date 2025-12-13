import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function PJOPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Proforma Job Orders</h2>
          <p className="text-muted-foreground">Manage proforma job orders and quotations</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New PJO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Proforma Job Orders</CardTitle>
          <CardDescription>View and manage all PJOs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No proforma job orders found. Create your first PJO to get started.</p>
        </CardContent>
      </Card>
    </div>
  )
}
