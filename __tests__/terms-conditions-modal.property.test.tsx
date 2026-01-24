/**
 * Feature: v0.85-terms-conditions
 * Property 2: Accept Button State Tied to Checkbox
 * 
 * Property-based tests for TermsConditionsModal component
 * using fast-check library and React Testing Library.
 * 
 * **Validates: Requirements 3.3**
 * THE T&C_Modal SHALL include an "Accept" button that is disabled until the checkbox is checked
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { TermsConditionsModal } from '@/components/terms-conditions-modal'

// =====================================================
// MOCKS
// =====================================================

// Mock the acceptTerms server action
const mockAcceptTerms = vi.fn()
vi.mock('@/app/(main)/actions/accept-terms', () => ({
  acceptTerms: () => mockAcceptTerms(),
}))

// Mock react-markdown to avoid complex rendering
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}))

// Mock remark-gfm
vi.mock('remark-gfm', () => ({
  default: () => {},
}))

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Get the Accept button element
 */
function getAcceptButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /Terima|Memproses/i }) as HTMLButtonElement
}

/**
 * Get the checkbox element
 */
function getCheckbox(): HTMLButtonElement {
  return screen.getByRole('checkbox') as HTMLButtonElement
}

/**
 * Check if button is disabled
 */
function isButtonDisabled(button: HTMLButtonElement): boolean {
  return button.disabled || button.getAttribute('disabled') !== null
}

// =====================================================
// Property 2: Accept Button State Tied to Checkbox
// **Validates: Requirements 3.3**
// =====================================================
describe('Feature: v0.85-terms-conditions, Property 2: Accept button state tied to checkbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: acceptTerms returns success
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Property: Accept button is disabled when checkbox is unchecked (initial state)
   * 
   * **Validates: Requirements 3.3**
   * THE T&C_Modal SHALL include an "Accept" button that is disabled until the checkbox is checked
   */
  it('Accept button is disabled when checkbox is unchecked (initial state)', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isOpen state
        (isOpen) => {
          cleanup()
          const onAccepted = vi.fn()
          
          render(<TermsConditionsModal isOpen={isOpen} onAccepted={onAccepted} />)
          
          if (isOpen) {
            const button = getAcceptButton()
            const checkbox = getCheckbox()
            
            // Initial state: checkbox unchecked, button disabled
            expect(checkbox.getAttribute('data-state')).toBe('unchecked')
            expect(isButtonDisabled(button)).toBe(true)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Accept button is enabled when checkbox is checked (not loading)
   * 
   * **Validates: Requirements 3.3**
   * THE T&C_Modal SHALL include an "Accept" button that is disabled until the checkbox is checked
   */
  it('Accept button is enabled when checkbox is checked (not loading)', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // Always test with modal open
        () => {
          cleanup()
          const onAccepted = vi.fn()
          
          render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
          
          const button = getAcceptButton()
          const checkbox = getCheckbox()
          
          // Initially disabled
          expect(isButtonDisabled(button)).toBe(true)
          
          // Check the checkbox
          fireEvent.click(checkbox)
          
          // After checking, button should be enabled
          expect(checkbox.getAttribute('data-state')).toBe('checked')
          expect(isButtonDisabled(button)).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Accept button disabled state is inverse of checkbox checked state (when not loading)
   * 
   * **Validates: Requirements 3.3**
   * For any state of the Terms Modal, the Accept button SHALL be enabled if and only if 
   * the acceptance checkbox is checked.
   */
  it('button disabled state is inverse of checkbox checked state (when not loading)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // Sequence of checkbox toggles
        (toggleSequence) => {
          cleanup()
          const onAccepted = vi.fn()
          
          render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
          
          const checkbox = getCheckbox()
          let expectedChecked = false // Initial state is unchecked
          
          for (const shouldToggle of toggleSequence) {
            if (shouldToggle) {
              fireEvent.click(checkbox)
              expectedChecked = !expectedChecked
            }
            
            const button = getAcceptButton()
            const isChecked = checkbox.getAttribute('data-state') === 'checked'
            
            // Verify checkbox state matches expected
            expect(isChecked).toBe(expectedChecked)
            
            // Verify button disabled is inverse of checkbox checked
            // Button should be disabled when checkbox is unchecked
            expect(isButtonDisabled(button)).toBe(!expectedChecked)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Accept button is always disabled when loading, regardless of checkbox state
   * 
   * **Validates: Requirements 3.3**
   * Button has disabled={!isChecked || isLoading}, so loading always disables
   * 
   * Note: This test uses a simpler approach since async property tests with controlled
   * promises are complex. We verify the loading behavior in unit tests below.
   */
  it('Accept button is always disabled when loading, regardless of checkbox state', async () => {
    // This property is verified through multiple iterations of the same scenario
    // Each iteration creates a fresh component and verifies loading state
    
    for (let i = 0; i < 100; i++) {
      cleanup()
      const onAccepted = vi.fn()
      
      // Create a controlled promise for this iteration
      let resolveAcceptTerms: (value: { success: boolean }) => void
      const acceptTermsPromise = new Promise<{ success: boolean }>((resolve) => {
        resolveAcceptTerms = resolve
      })
      mockAcceptTerms.mockReturnValue(acceptTermsPromise)
      
      render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
      
      const checkbox = getCheckbox()
      
      // Check the checkbox first
      fireEvent.click(checkbox)
      expect(checkbox.getAttribute('data-state')).toBe('checked')
      
      // Button should be enabled before clicking
      let button = getAcceptButton()
      expect(isButtonDisabled(button)).toBe(false)
      
      // Click the accept button to trigger loading state
      fireEvent.click(button)
      
      // Wait for loading state to be applied
      await waitFor(() => {
        button = screen.getByRole('button', { name: /Memproses/i })
        expect(isButtonDisabled(button)).toBe(true)
      })
      
      // Resolve the promise to complete the test
      resolveAcceptTerms!({ success: true })
      
      // Wait for state to settle before next iteration
      await waitFor(() => {
        expect(mockAcceptTerms).toHaveBeenCalled()
      })
      
      vi.clearAllMocks()
      mockAcceptTerms.mockResolvedValue({ success: true })
    }
  }, 60000) // Increase timeout for 100 iterations

  /**
   * Property: Toggling checkbox multiple times maintains correct button state
   * 
   * **Validates: Requirements 3.3**
   */
  it('toggling checkbox multiple times maintains correct button state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // Reduced max toggles for performance
        (numToggles) => {
          cleanup()
          const onAccepted = vi.fn()
          
          render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
          
          const checkbox = getCheckbox()
          let expectedChecked = false
          
          for (let i = 0; i < numToggles; i++) {
            fireEvent.click(checkbox)
            expectedChecked = !expectedChecked
            
            const button = getAcceptButton()
            const isChecked = checkbox.getAttribute('data-state') === 'checked'
            
            expect(isChecked).toBe(expectedChecked)
            expect(isButtonDisabled(button)).toBe(!expectedChecked)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  }, 30000) // Increase timeout for this test

  /**
   * Property: Button state is deterministic - same checkbox state always produces same button state
   * 
   * **Validates: Requirements 3.3**
   */
  it('button state is deterministic - same checkbox state always produces same button state', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // Final checkbox state (checked or unchecked)
        (shouldBeChecked) => {
          cleanup()
          const onAccepted = vi.fn()
          
          render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
          
          const checkbox = getCheckbox()
          
          // Set checkbox to desired state
          if (shouldBeChecked) {
            fireEvent.click(checkbox)
          }
          
          const button = getAcceptButton()
          const isChecked = checkbox.getAttribute('data-state') === 'checked'
          
          // Verify deterministic behavior
          expect(isChecked).toBe(shouldBeChecked)
          expect(isButtonDisabled(button)).toBe(!shouldBeChecked)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

// =====================================================
// Unit Tests for TermsConditionsModal Button State
// =====================================================
describe('Feature: v0.85-terms-conditions, TermsConditionsModal Button State Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Button is disabled by default when modal opens
   * 
   * **Validates: Requirements 3.3**
   */
  it('button is disabled by default when modal opens', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const button = getAcceptButton()
    expect(isButtonDisabled(button)).toBe(true)
  })

  /**
   * Test: Button becomes enabled after checking checkbox
   * 
   * **Validates: Requirements 3.3**
   */
  it('button becomes enabled after checking checkbox', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    const button = getAcceptButton()
    
    // Initially disabled
    expect(isButtonDisabled(button)).toBe(true)
    
    // Check checkbox
    fireEvent.click(checkbox)
    
    // Now enabled
    expect(isButtonDisabled(button)).toBe(false)
  })

  /**
   * Test: Button becomes disabled again after unchecking checkbox
   * 
   * **Validates: Requirements 3.3**
   */
  it('button becomes disabled again after unchecking checkbox', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    
    // Check then uncheck
    fireEvent.click(checkbox) // Check
    fireEvent.click(checkbox) // Uncheck
    
    const button = getAcceptButton()
    expect(isButtonDisabled(button)).toBe(true)
  })

  /**
   * Test: Checkbox is unchecked by default
   * 
   * **Validates: Requirements 3.3**
   */
  it('checkbox is unchecked by default', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    expect(checkbox.getAttribute('data-state')).toBe('unchecked')
  })

  /**
   * Test: Button shows "Terima" text when not loading
   * 
   * **Validates: Requirements 3.3**
   */
  it('button shows "Terima" text when not loading', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    expect(screen.getByText('Terima')).toBeInTheDocument()
  })

  /**
   * Test: Button shows "Memproses..." text when loading
   * 
   * **Validates: Requirements 3.3**
   */
  it('button shows "Memproses..." text when loading', async () => {
    // Create a promise that never resolves to keep loading state
    mockAcceptTerms.mockReturnValue(new Promise(() => {}))
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Memproses...')).toBeInTheDocument()
    })
  })

  /**
   * Test: Modal does not render content when isOpen is false
   */
  it('modal does not render content when isOpen is false', () => {
    render(<TermsConditionsModal isOpen={false} onAccepted={vi.fn()} />)
    
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Terima/i })).not.toBeInTheDocument()
  })

  /**
   * Test: Checkbox has correct id attribute
   */
  it('checkbox has correct id attribute', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = document.getElementById('accept-terms')
    expect(checkbox).toBeInTheDocument()
  })

  /**
   * Test: Button is disabled during loading even if checkbox is checked
   */
  it('button is disabled during loading even if checkbox is checked', async () => {
    // Create a controlled promise
    let resolvePromise: (value: { success: boolean }) => void
    const promise = new Promise<{ success: boolean }>((resolve) => {
      resolvePromise = resolve
    })
    mockAcceptTerms.mockReturnValue(promise)
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    // Button should be enabled before clicking
    let button = getAcceptButton()
    expect(isButtonDisabled(button)).toBe(false)
    
    // Click to start loading
    fireEvent.click(button)
    
    // Button should be disabled during loading
    await waitFor(() => {
      button = screen.getByRole('button', { name: /Memproses/i })
      expect(isButtonDisabled(button)).toBe(true)
    })
    
    // Resolve to clean up
    resolvePromise!({ success: true })
  })
})
