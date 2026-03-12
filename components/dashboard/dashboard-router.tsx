/**
 * Dashboard Router Component
 * v0.35: Role-Based Homepage Routing
 * 
 * Client-side component that resolves the user's homepage and redirects.
 * Uses router.replace() to prevent back-button issues.
 * Shows skeleton during resolution.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from './dashboard-skeleton'
import { DEFAULT_ROLE_HOMEPAGES, DEFAULT_FALLBACK_ROUTE } from '@/types/homepage-routing'
import { UserRole } from '@/types/permissions'

interface DashboardRouterProps {
  userRole: string
  customHomepage?: string | null
}

/**
 * Get the homepage route for a user based on their role and custom settings
 */
function getHomepageForRole(role: string, customHomepage?: string | null): string {
  // Priority 1: Custom homepage override
  if (customHomepage) {
    return customHomepage
  }
  
  // Priority 2: Role-based homepage
  const roleHomepage = DEFAULT_ROLE_HOMEPAGES[role as UserRole]
  if (roleHomepage) {
    return roleHomepage
  }
  
  // Priority 3: Default fallback
  return DEFAULT_FALLBACK_ROUTE
}

export function DashboardRouter({ userRole, customHomepage }: DashboardRouterProps) {
  const router = useRouter()
  const [isRedirecting, _setIsRedirecting] = useState(true)

  useEffect(() => {
    const redirect = async () => {
      try {
        const homepage = getHomepageForRole(userRole, customHomepage)
        
        // Use replace to prevent back-button issues
        router.replace(homepage)
      } catch (error) {
        console.error('Error resolving homepage:', error)
        // Fallback to default dashboard on error
        router.replace(DEFAULT_FALLBACK_ROUTE)
      }
    }

    redirect()
  }, [userRole, customHomepage, router])

  // Show skeleton while redirecting
  if (isRedirecting) {
    return <DashboardSkeleton />
  }

  return null
}

/**
 * Hook for programmatic homepage navigation
 */
export function useHomepageRedirect() {
  const router = useRouter()

  const redirectToHomepage = (role: string, customHomepage?: string | null) => {
    const homepage = getHomepageForRole(role, customHomepage)
    router.replace(homepage)
  }

  return { redirectToHomepage }
}
