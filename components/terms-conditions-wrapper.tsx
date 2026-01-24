'use client'

/**
 * Terms & Conditions Wrapper Component
 * v0.85: Terms & Conditions System
 * 
 * Wraps the main layout content and shows T&C modal when acceptance is required.
 * 
 * Requirements:
 * - 5.5: While T&C modal is displayed, prevent access to other system features
 * - 5.6: When user accepts T&C, close modal and allow system access
 * - 6.1: Display T&C modal for new users on first login
 * - 6.2: T&C modal is first interaction required before accessing features
 * - 6.3: Record acceptance and allow system access
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TermsConditionsModal } from '@/components/terms-conditions-modal'

interface TermsConditionsWrapperProps {
  needsAcceptance: boolean
  children: React.ReactNode
}

/**
 * Wrapper component that shows T&C modal when acceptance is required.
 * 
 * When needsAcceptance is true:
 * - Shows the T&C modal (non-dismissible)
 * - Renders children but they are blocked by the modal overlay
 * 
 * When user accepts:
 * - Refreshes the page to get updated user profile
 * - Modal closes and user can access the system
 */
export function TermsConditionsWrapper({ 
  needsAcceptance, 
  children 
}: TermsConditionsWrapperProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(needsAcceptance)

  /**
   * Handle successful T&C acceptance
   * Requirement 5.6: Close modal and allow system access
   * Requirement 6.3: Record acceptance and allow system access
   */
  const handleAccepted = useCallback(() => {
    // Close the modal
    setShowModal(false)
    // Refresh the page to get updated user profile with new tc_accepted_at and tc_version
    router.refresh()
  }, [router])

  return (
    <>
      {children}
      {/* 
        Requirement 5.5: While T&C modal is displayed, prevent access to other features
        The modal overlay blocks interaction with the underlying content
      */}
      <TermsConditionsModal 
        isOpen={showModal} 
        onAccepted={handleAccepted} 
      />
    </>
  )
}
