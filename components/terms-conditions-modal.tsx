'use client'

/**
 * Terms & Conditions Modal Component
 * v0.85: Terms & Conditions System
 * 
 * Displays T&C content in a non-dismissible modal that requires user acceptance.
 * 
 * Requirements:
 * - 3.1: Show TERMS_CONTENT in a scrollable area
 * - 3.2: Include checkbox for acceptance confirmation
 * - 3.3: Accept button disabled until checkbox is checked
 * - 3.4: Non-dismissible (no close button, no backdrop click)
 * - 3.5: Call acceptTerms on accept
 * - 3.6: Display error message on failure
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { TERMS_CONTENT } from '@/lib/terms-conditions'
import { acceptTerms } from '@/app/(main)/actions/accept-terms'

interface TermsConditionsModalProps {
  isOpen: boolean
  onAccepted: () => void
}

/**
 * Custom Dialog Overlay without click-to-dismiss
 * Requirement 3.4: Cannot be dismissed via backdrop click
 */
const DialogOverlay = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
)

/**
 * Custom Dialog Content without close button
 * Requirement 3.4: No close button
 */
const DialogContent = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        className
      )}
      // Requirement 3.4: Prevent escape key dismissal
      onEscapeKeyDown={(e) => e.preventDefault()}
      // Requirement 3.4: Prevent pointer down outside dismissal
      onPointerDownOutside={(e) => e.preventDefault()}
      // Requirement 3.4: Prevent interact outside dismissal
      onInteractOutside={(e) => e.preventDefault()}
      {...props}
    >
      {children}
      {/* No close button - Requirement 3.4 */}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
)

/**
 * Terms & Conditions Modal
 * 
 * A non-dismissible modal that displays T&C content and requires user acceptance.
 */
export function TermsConditionsModal({ isOpen, onAccepted }: TermsConditionsModalProps) {
  const [isChecked, setIsChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle acceptance of terms
   * Requirement 3.5: Call acceptTerms on accept
   * Requirement 3.6: Display error message on failure
   */
  const handleAccept = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await acceptTerms()

      if (result.success) {
        onAccepted()
      } else {
        // Requirement 3.6: Display error message
        setError(result.error || 'Gagal menyimpan persetujuan. Silakan coba lagi.')
      }
    } catch {
      // Requirement 3.6: Display error message for unexpected errors
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DialogPrimitive.Root open={isOpen}>
      <DialogContent>
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
            Syarat dan Ketentuan
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            Harap baca dan setujui syarat dan ketentuan berikut untuk melanjutkan.
          </DialogPrimitive.Description>
        </div>

        {/* Requirement 3.1: Scrollable area for TERMS_CONTENT */}
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold mt-6 mb-3 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold mt-5 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-medium mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-3 leading-relaxed text-sm">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-3 space-y-1 text-sm">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-3 space-y-1 text-sm">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="ml-2">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                hr: () => (
                  <hr className="my-4 border-border" />
                ),
              }}
            >
              {TERMS_CONTENT}
            </ReactMarkdown>
          </div>
        </ScrollArea>

        {/* Requirement 3.6: Error message display */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {/* Footer with checkbox and button */}
        <div className="flex flex-col gap-4">
          {/* Requirement 3.2: Checkbox for acceptance confirmation */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="accept-terms"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              disabled={isLoading}
              aria-describedby="accept-terms-label"
            />
            <label
              id="accept-terms-label"
              htmlFor="accept-terms"
              className="text-sm leading-relaxed cursor-pointer select-none"
            >
              Saya telah membaca, memahami, dan menyetujui Syarat dan Ketentuan di atas.
            </label>
          </div>

          {/* Requirement 3.3: Accept button disabled until checkbox is checked */}
          <div className="flex justify-end">
            <Button
              onClick={handleAccept}
              disabled={!isChecked || isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? 'Memproses...' : 'Terima'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogPrimitive.Root>
  )
}
