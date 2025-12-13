import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage customer invoices and billing</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>View and manage all invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No invoices found. Create your first invoice to get started.</p>
        </CardContent>
      </Card>
    </div>
  )
}
