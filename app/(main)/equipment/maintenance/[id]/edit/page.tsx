import { Suspense } from 'react'
import { EditMaintenanceClient } from './edit-maintenance-client'

interface EditMaintenancePageProps {
  params: Promise<{ id: string }>
}

export default async function EditMaintenancePage({ params }: EditMaintenancePageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12">Loading...</div>}>
      <EditMaintenanceClient recordId={id} />
    </Suspense>
  )
}
