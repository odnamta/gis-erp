import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PEBDetailView } from '@/components/peb'
import { getPEBDocument } from '@/lib/peb-actions'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils'
import { canViewPEB, canEditPEB, canDeletePEB } from '@/lib/permissions'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PEBDetailPage({ params }: PageProps) {
  const profile = await getCurrentUserProfile()
  const { explorerReadOnly } = await guardPage(canViewPEB(profile))

  const { id } = await params
  const result = await getPEBDocument(id)

  if (result.error || !result.data) {
    notFound()
  }

  const peb = result.data

  const permissions = {
    canEdit: explorerReadOnly ? false : canEditPEB(profile),
    canDelete: explorerReadOnly ? false : canDeletePEB(profile),
    canUpdateStatus: explorerReadOnly ? false : canEditPEB(profile),
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customs/export">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-muted-foreground">Back to Export Documents</span>
      </div>

      {/* Detail View */}
      <PEBDetailView peb={peb} permissions={permissions} />
    </div>
  )
}
