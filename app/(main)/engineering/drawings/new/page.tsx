import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { isExplorerMode } from '@/lib/auth-utils'
import { DrawingForm } from '@/components/drawings/drawing-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

export default async function NewDrawingPage() {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/engineering/drawings');
  }
  // Explorer mode users should not create drawings
  const explorer = await isExplorerMode()
  if (explorer) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Mode Explorer</AlertTitle>
          <AlertDescription>
            Tidak bisa membuat drawing baru. Anda sedang dalam mode explorer (read-only).
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="ghost" asChild>
            <Link href="/engineering/drawings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Daftar Drawing
            </Link>
          </Button>
        </div>
      </div>
    )
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
