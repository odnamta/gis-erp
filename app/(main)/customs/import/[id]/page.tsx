import { notFound, redirect } from 'next/navigation'
import { PIBDetailView } from '@/components/pib'
import { getPIBDocument } from '@/lib/pib-actions'
import { getCurrentUserProfile } from '@/lib/auth-utils'
import { canViewPIB, canEditPIB, canDeletePIB, canViewPIBDuties, canUpdatePIBStatus } from '@/lib/permissions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PIBDetailPage({ params }: PageProps) {
  // Permission check
  const profile = await getCurrentUserProfile()
  if (!canViewPIB(profile)) {
    redirect('/dashboard')
  }

  const { id } = await params
  const result = await getPIBDocument(id)

  if (result.error || !result.data) {
    notFound()
  }

  // Pass permission flags to the component
  const permissions = {
    canEdit: canEditPIB(profile),
    canDelete: canDeletePIB(profile),
    canViewDuties: canViewPIBDuties(profile),
    canUpdateStatus: canUpdatePIBStatus(profile),
  }

  return (
    <div className="container mx-auto py-6">
      <PIBDetailView pib={result.data} permissions={permissions} />
    </div>
  )
}
