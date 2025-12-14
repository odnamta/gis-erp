import { InvoicesClient } from './invoices-client'

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage customer invoices and billing</p>
        </div>
      </div>

      <InvoicesClient />
    </div>
  )
}
