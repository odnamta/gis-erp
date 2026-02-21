import { redirect } from 'next/navigation'
import { isExplorerMode } from '@/lib/auth-utils'
import { DrawingForm } from '@/components/drawings/drawing-form'

export default async function NewDrawingPage() {
  // Explorer mode users should not create drawings
  const explorer = await isExplorerMode()
  if (explorer) {
    redirect('/engineering/drawings')
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Drawing</h1>
        <p className="text-muted-foreground">
          Create a new engineering drawing entry
        </p>
      </div>

      <DrawingForm mode="create" />
    </div>
  )
}
