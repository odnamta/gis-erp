import { redirect } from 'next/navigation'
import { canViewEmployees } from '@/lib/permissions'
import { getCurrentUserProfile, isExplorerMode } from '@/lib/auth-utils'
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner'

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  // HR layout allows ALL authenticated users through.
  // Self-service pages (my-leave, my-attendance) need access for everyone.
  // Sensitive HR pages (employees, payroll) have their own guardPage() checks.
  const hasHRAccess = canViewEmployees(profile)
  const isExplorer = await isExplorerMode()
  const showBanner = !hasHRAccess && isExplorer

  return (
    <>
      {showBanner && <ExplorerReadOnlyBanner />}
      {children}
    </>
  )
}
