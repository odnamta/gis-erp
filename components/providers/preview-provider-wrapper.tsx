'use client'

import { ReactNode } from 'react'
import { PreviewProvider } from '@/contexts/preview-context'
import { PreviewBanner } from '@/components/preview/preview-banner'
import { usePermissions } from '@/components/providers/permission-provider'
import { usePreviewContext } from '@/contexts/preview-context'
import { getDefaultPermissions } from '@/lib/permissions'
import { UserRole, UserPermissions } from '@/types/permissions'

function PreviewBannerWrapper() {
  const { previewRole, setPreviewRole, isPreviewActive } = usePreviewContext()

  if (!isPreviewActive || !previewRole) {
    return null
  }

  return (
    <PreviewBanner 
      previewRole={previewRole} 
      onExit={() => setPreviewRole(null)}
      onRoleChange={setPreviewRole}
    />
  )
}

interface PreviewProviderWrapperProps {
  children: ReactNode
}

export function PreviewProviderWrapper({ children }: PreviewProviderWrapperProps) {
  const { profile } = usePermissions()

  const actualRole = profile?.role || 'viewer'
  const actualPermissions = profile
    ? {
        can_see_revenue: profile.can_see_revenue,
        can_see_profit: profile.can_see_profit,
        can_approve_pjo: profile.can_approve_pjo,
        can_manage_invoices: profile.can_manage_invoices,
        can_manage_users: profile.can_manage_users,
        can_create_pjo: profile.can_create_pjo,
        can_fill_costs: profile.can_fill_costs,
      }
    : getDefaultPermissions('ops' as UserRole)

  return (
    <PreviewProvider actualRole={actualRole as UserRole} actualPermissions={actualPermissions as UserPermissions}>
      <PreviewBannerWrapper />
      {children}
    </PreviewProvider>
  )
}
