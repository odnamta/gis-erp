'use client'

/**
 * Welcome Wrapper Component
 * v0.86: Welcome Flow
 * 
 * Wraps the main layout content and shows Welcome modal when needed.
 * This modal appears after T&C acceptance for first-time users.
 * 
 * Requirements:
 * - 4.1: Close modal and record timestamp on dismiss
 * - 4.2: Navigate to href, close modal, and record timestamp on quick action click
 * - 4.3: Update welcome_shown_at in user_profiles table when dismissed
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WelcomeModal } from '@/components/welcome-modal'
import { UserRole } from '@/types/permissions'

interface WelcomeWrapperProps {
  needsWelcome: boolean
  role: UserRole
  children: React.ReactNode
}

/**
 * Wrapper component that shows Welcome modal when needed.
 * 
 * When needsWelcome is true:
 * - Shows the Welcome modal (dismissible)
 * - Renders children underneath the modal overlay
 * 
 * When user dismisses or clicks a quick action:
 * - markWelcomeShown is called (handled by WelcomeModal)
 * - Modal closes
 * - Page refreshes to get updated user profile
 */
export function WelcomeWrapper({ 
  needsWelcome, 
  role,
  children 
}: WelcomeWrapperProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(needsWelcome)

  /**
   * Handle modal dismiss (either via dismiss button or quick action)
   * 
   * Requirement 4.1: Close modal and record timestamp on dismiss
   * Requirement 4.2: Navigate to href, close modal, and record timestamp on quick action
   * Requirement 4.3: Update welcome_shown_at in user_profiles table
   * 
   * Note: The actual markWelcomeShown call is handled by WelcomeModal.
   * This callback is called after successful database update.
   */
  const handleDismiss = useCallback(() => {
    // Close the modal
    setShowModal(false)
    // Refresh the page to get updated user profile with new welcome_shown_at
    router.refresh()
  }, [router])

  return (
    <>
      {children}
      {/* 
        Welcome modal is dismissible (unlike T&C modal)
        Requirement 6.3: Modal is dismissible
        Requirement 6.4: Allow backdrop click or escape key to dismiss
      */}
      <WelcomeModal 
        isOpen={showModal} 
        role={role}
        onDismiss={handleDismiss} 
      />
    </>
  )
}
