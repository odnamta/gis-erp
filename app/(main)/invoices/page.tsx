import Link from 'next/link'
import { InvoicesClient } from './invoices-client'
import { getInvoiceStats } from './actions'
import { getUserProfile } from '@/lib/permissions-server'
import { canAccessFeature } from '@/lib/permissions'
import { guardPage } from '@/lib/auth-utils'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function InvoicesPage() {
  const profile = await getUserProfile()
  const { explorerReadOnly } = await guardPage(
    canAccessFeature(profile, 'invoices.view')
  )
  const canCreate = !explorerReadOnly && canAccessFeature(profile, 'invoices.create')
  const stats = await getInvoiceStats()

  return (
    <div className="space-y-6">
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage customer invoices and billing</p>
        </div>
        {canCreate && (
          <Link href="/invoices/new" className={buttonVariants({ variant: 'default' })}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        )}
      </div>

      <InvoicesClient serverStats={stats} />
    </div>
  )
}
