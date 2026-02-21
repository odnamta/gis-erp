import { redirect } from 'next/navigation'
import { isExplorerMode } from '@/lib/auth-utils'
import { TransmittalForm } from '@/components/drawings/transmittal-form'

export default async function NewTransmittalPage() {
  // Explorer mode users should not create transmittals
  const explorer = await isExplorerMode()
  if (explorer) {
    redirect('/engineering/drawings/transmittals')
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Transmittal</h1>
        <p className="text-muted-foreground">
          Create a new drawing transmittal for distribution
        </p>
      </div>

      <TransmittalForm />
    </div>
  )
}
