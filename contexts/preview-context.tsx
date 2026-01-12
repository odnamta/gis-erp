'use client'

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react'
import { UserRole, UserPermissions } from '@/types/permissions'
import {
  canUsePreviewFeature,
  getEffectiveRole,
  getEffectivePermissions,
} from '@/lib/preview-utils'

// SessionStorage key for preview role
const PREVIEW_ROLE_KEY = 'gama-erp-preview-role'

export interface PreviewContextType {
  previewRole: UserRole | null
  setPreviewRole: (role: UserRole | null) => void
  effectiveRole: UserRole
  effectivePermissions: UserPermissions
  isPreviewActive: boolean
  canUsePreview: boolean
}

const PreviewContext = createContext<PreviewContextType | null>(null)

export interface PreviewProviderProps {
  children: ReactNode
  actualRole: UserRole
  actualPermissions: UserPermissions
}

export function PreviewProvider({
  children,
  actualRole,
  actualPermissions,
}: PreviewProviderProps) {
  // Initialize state from sessionStorage (client-side only)
  const [previewRole, setPreviewRoleState] = useState<UserRole | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = sessionStorage.getItem(PREVIEW_ROLE_KEY)
      return stored ? (stored as UserRole) : null
    } catch {
      return null
    }
  })

  const canUsePreview = useMemo(
    () => canUsePreviewFeature(actualRole),
    [actualRole]
  )

  const setPreviewRole = (role: UserRole | null) => {
    // Only allow setting preview if user can use preview feature
    if (canUsePreview) {
      setPreviewRoleState(role)

      // Persist to sessionStorage
      if (typeof window !== 'undefined') {
        try {
          if (role === null) {
            sessionStorage.removeItem(PREVIEW_ROLE_KEY)
          } else {
            sessionStorage.setItem(PREVIEW_ROLE_KEY, role)
          }
        } catch (error) {
          console.error('Failed to save preview role to sessionStorage:', error)
        }
      }
    }
  }

  // Clear preview if user loses preview permission (e.g., role changed)
  useEffect(() => {
    if (!canUsePreview && previewRole !== null) {
      setPreviewRole(null)
    }
  }, [canUsePreview, previewRole])

  const effectiveRole = useMemo(
    () => getEffectiveRole(actualRole, previewRole),
    [actualRole, previewRole]
  )

  const effectivePermissions = useMemo(
    () => getEffectivePermissions(actualRole, actualPermissions, previewRole),
    [actualRole, actualPermissions, previewRole]
  )

  const isPreviewActive = previewRole !== null && canUsePreview

  const value: PreviewContextType = {
    previewRole,
    setPreviewRole,
    effectiveRole,
    effectivePermissions,
    isPreviewActive,
    canUsePreview,
  }

  return (
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  )
}

export function usePreviewContext(): PreviewContextType {
  const context = useContext(PreviewContext)
  if (!context) {
    throw new Error('usePreviewContext must be used within a PreviewProvider')
  }
  return context
}
