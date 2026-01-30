'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UserProfile,
  UserPermissions,
  UserRole,
  FeatureKey,
  PermissionContextType,
} from '@/types/permissions'
import {
  hasPermission as checkHasPermission,
  isRole as checkIsRole,
  canAccessFeature,
} from '@/lib/permissions'

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

interface PermissionProviderProps {
  children: ReactNode
  initialProfile?: UserProfile | null
}

export function PermissionProvider({ children, initialProfile }: PermissionProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null)
  const [isLoading, setIsLoading] = useState(!initialProfile)

  const fetchProfile = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData as unknown as UserProfile)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!initialProfile) {
      fetchProfile()
    }
  }, [initialProfile, fetchProfile])

  const hasPermission = useCallback(
    (permission: keyof UserPermissions): boolean => {
      return checkHasPermission(profile, permission)
    },
    [profile]
  )

  const isRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      return checkIsRole(profile, role)
    },
    [profile]
  )

  const canAccess = useCallback(
    (feature: FeatureKey): boolean => {
      return canAccessFeature(profile, feature)
    },
    [profile]
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchProfile()
  }, [fetchProfile])

  return (
    <PermissionContext.Provider
      value={{
        profile,
        isLoading,
        hasPermission,
        isRole,
        canAccess,
        refresh,
      }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}
