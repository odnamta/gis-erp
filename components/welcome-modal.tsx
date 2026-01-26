'use client'

/**
 * Welcome Modal Component
 * v0.86: Welcome Flow
 * 
 * Displays role-specific welcome content with quick action buttons.
 * This modal is dismissible (unlike T&C modal).
 * 
 * Requirements:
 * - 3.3: Show role-specific title and description
 * - 3.4: Show 2-3 quick action buttons based on user's role
 * - 4.1: Close modal and record timestamp on dismiss
 * - 4.2: Navigate to href, close modal, and record timestamp on quick action click
 * - 4.4: Display error message on failure and keep modal open
 */

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getWelcomeContent } from '@/lib/welcome-content'
import { markWelcomeShown } from '@/app/(main)/actions/mark-welcome-shown'
import { UserRole } from '@/types/permissions'

interface WelcomeModalProps {
  isOpen: boolean
  role: UserRole
  onDismiss: () => void
}

/**
 * Welcome Modal
 * 
 * A dismissible modal that displays role-specific welcome content
 * and quick action buttons to help users get started.
 */
export function WelcomeModal({ isOpen, role, onDismiss }: WelcomeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Requirement 3.3: Get role-specific content
  const content = getWelcomeContent(role)

  /**
   * Handle dismiss button click
   * Requirement 4.1: Close modal and record timestamp
   * Requirement 4.4: Display error message on failure
   */
  const handleDismiss = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await markWelcomeShown()

      if (result.success) {
        onDismiss()
      } else {
        // Requirement 4.4: Display error message and keep modal open
        setError(result.error || 'Gagal menyimpan. Silakan coba lagi.')
      }
    } catch {
      // Requirement 4.4: Display error message for unexpected errors
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle quick action button click
   * Requirement 4.2: Navigate to href, close modal, and record timestamp
   * Requirement 4.4: Display error message on failure
   */
  const handleQuickAction = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await markWelcomeShown()

      if (result.success) {
        // Navigation will happen via Link component
        onDismiss()
      } else {
        // Requirement 4.4: Display error message and keep modal open
        setError(result.error || 'Gagal menyimpan. Silakan coba lagi.')
      }
    } catch {
      // Requirement 4.4: Display error message for unexpected errors
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          {/* Requirement 3.3: Role-specific title */}
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          {/* Requirement 3.3: Role-specific description */}
          <DialogDescription className="text-sm leading-relaxed pt-2">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {/* Requirement 4.4: Error message display */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {/* Requirement 3.4: Quick action buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-sm font-medium text-muted-foreground">
            Mulai dengan:
          </p>
          {content.quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              onClick={handleQuickAction}
              className="block"
            >
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4"
                disabled={isLoading}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">{action.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {action.description}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 ml-2" />
              </Button>
            </Link>
          ))}
        </div>

        {/* Dismiss button */}
        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            onClick={handleDismiss}
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : 'Lewati'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
