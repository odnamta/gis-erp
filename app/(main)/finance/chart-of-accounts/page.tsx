import { Metadata } from 'next'
import { getChartOfAccounts } from '@/lib/gl-actions'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils'
import { profileHasRole } from '@/lib/auth-utils'
import { ChartOfAccountsClient } from './coa-client'

export const metadata: Metadata = {
  title: 'Chart of Accounts | Gama ERP',
  description: 'Kelola daftar akun (Chart of Accounts)',
}

const GL_ROLES = ['owner', 'director', 'sysadmin', 'finance_manager', 'finance'] as const

export default async function ChartOfAccountsPage() {
  const profile = await getCurrentUserProfile()
  const { explorerReadOnly } = await guardPage(!!profile && profileHasRole(profile, [...GL_ROLES]))

  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard')
  }

  const accounts = await getChartOfAccounts()
  const canWrite = profileHasRole(profile, ['owner', 'director', 'sysadmin', 'finance_manager', 'finance'])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        <p className="text-muted-foreground">
          Kelola daftar akun untuk pencatatan jurnal
        </p>
      </div>
      <ChartOfAccountsClient accounts={accounts} canWrite={canWrite} />
    </div>
  )
}
