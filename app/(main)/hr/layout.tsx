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

  const hasAccess = canViewEmployees(profile)
  const isExplorer = await isExplorerMode()

  if (!hasAccess && !isExplorer) {
    redirect('/dashboard')
  }

  return (
    <>
      {!hasAccess && isExplorer && <ExplorerReadOnlyBanner />}
      {children}
    </>
  )
}
