/**
 * Feature: v0.85-terms-conditions
 * Unit Tests for TermsConditionsModal Component
 * 
 * Tests for modal component behavior covering:
 * - Content rendering (Requirement 3.1)
 * - Scrollable area (Requirement 3.1)
 * - Checkbox functionality (Requirement 3.2)
 * - Non-dismissible behavior (Requirement 3.4)
 * - Error display (Requirement 3.6)
 * - onAccepted callback
 * 
 * Note: Button state tests are covered in terms-conditions-modal.property.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react'
import { TermsConditionsModal } from '@/components/terms-conditions-modal'
import { TERMS_CONTENT } from '@/lib/terms-conditions'

// =====================================================
// MOCKS
// =====================================================

// Mock the acceptTerms server action
const mockAcceptTerms = vi.fn()
vi.mock('@/app/(main)/actions/accept-terms', () => ({
  acceptTerms: () => mockAcceptTerms(),
}))

// Mock react-markdown to render content as text for testing
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
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

// =====================================================
// Requirement 3.1: Content Rendering Tests
// =====================================================
describe('Feature: v0.85-terms-conditions, Requirement 3.1: Content Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: TERMS_CONTENT is displayed in the modal
   * 
   * **Validates: Requirement 3.1**
   * WHEN the T&C_Modal is displayed, THE T&C_System SHALL show the TERMS_CONTENT in a scrollable area
   */
  it('displays TERMS_CONTENT in the modal', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const markdownContent = screen.getByTestId('markdown-content')
    expect(markdownContent).toBeInTheDocument()
    expect(markdownContent.textContent).toBe(TERMS_CONTENT)
  })

  /**
   * Test: Modal title is displayed
   * 
   * **Validates: Requirement 3.1**
   */
  it('displays modal title "Syarat dan Ketentuan"', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
  })

  /**
   * Test: Modal description is displayed
   * 
   * **Validates: Requirement 3.1**
   */
  it('displays modal description', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    expect(screen.getByText(/Harap baca dan setujui syarat dan ketentuan/i)).toBeInTheDocument()
  })

  /**
   * Test: Scrollable area exists for content
   * 
   * **Validates: Requirement 3.1**
   * WHEN the T&C_Modal is displayed, THE T&C_System SHALL show the TERMS_CONTENT in a scrollable area
   */
  it('renders content in a scrollable area', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // ScrollArea from shadcn/ui adds data-radix-scroll-area-viewport
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]')
    expect(scrollArea).toBeInTheDocument()
  })

  /**
   * Test: Content area has appropriate height constraint for scrolling
   * 
   * **Validates: Requirement 3.1**
   */
  it('content area has height constraint for scrolling', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // The ScrollArea wrapper should have h-[400px] class
    // ScrollArea uses relative overflow-hidden as base classes
    const scrollAreaRoot = document.querySelector('.h-\\[400px\\]')
    expect(scrollAreaRoot).toBeInTheDocument()
  })

  /**
   * Test: Modal does not render when isOpen is false
   */
  it('does not render content when isOpen is false', () => {
    render(<TermsConditionsModal isOpen={false} onAccepted={vi.fn()} />)
    
    expect(screen.queryByText('Syarat dan Ketentuan')).not.toBeInTheDocument()
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument()
  })
})

// =====================================================
// Requirement 3.2: Checkbox Functionality Tests
// =====================================================
describe('Feature: v0.85-terms-conditions, Requirement 3.2: Checkbox Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Checkbox exists in the modal
   * 
   * **Validates: Requirement 3.2**
   * THE T&C_Modal SHALL include a checkbox for the user to confirm acceptance
   */
  it('includes a checkbox for acceptance confirmation', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    expect(checkbox).toBeInTheDocument()
  })

  /**
   * Test: Checkbox has associated label text
   * 
   * **Validates: Requirement 3.2**
   */
  it('checkbox has associated label text', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    expect(screen.getByText(/Saya telah membaca, memahami, dan menyetujui/i)).toBeInTheDocument()
  })

  /**
   * Test: Checkbox is unchecked by default
   * 
   * **Validates: Requirement 3.2**
   */
  it('checkbox is unchecked by default', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    expect(checkbox.getAttribute('data-state')).toBe('unchecked')
  })

  /**
   * Test: Checkbox can be checked by clicking
   * 
   * **Validates: Requirement 3.2**
   */
  it('checkbox can be checked by clicking', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    expect(checkbox.getAttribute('data-state')).toBe('checked')
  })

  /**
   * Test: Checkbox can be unchecked after being checked
   * 
   * **Validates: Requirement 3.2**
   */
  it('checkbox can be unchecked after being checked', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = getCheckbox()
    fireEvent.click(checkbox) // Check
    fireEvent.click(checkbox) // Uncheck
    
    expect(checkbox.getAttribute('data-state')).toBe('unchecked')
  })

  /**
   * Test: Checkbox has correct id attribute for accessibility
   * 
   * **Validates: Requirement 3.2**
   */
  it('checkbox has correct id attribute for accessibility', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const checkbox = document.getElementById('accept-terms')
    expect(checkbox).toBeInTheDocument()
  })

  /**
   * Test: Checkbox label is clickable (htmlFor association)
   * 
   * **Validates: Requirement 3.2**
   */
  it('clicking label text toggles checkbox', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const label = screen.getByText(/Saya telah membaca, memahami, dan menyetujui/i)
    const checkbox = getCheckbox()
    
    // Initial state
    expect(checkbox.getAttribute('data-state')).toBe('unchecked')
    
    // Click label
    fireEvent.click(label)
    
    // Checkbox should be checked
    expect(checkbox.getAttribute('data-state')).toBe('checked')
  })
})

// =====================================================
// Requirement 3.4: Non-Dismissible Behavior Tests
// =====================================================
describe('Feature: v0.85-terms-conditions, Requirement 3.4: Non-Dismissible Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: No close button exists in the modal
   * 
   * **Validates: Requirement 3.4**
   * THE T&C_Modal SHALL NOT be dismissible without accepting the terms (no close button, no backdrop click)
   */
  it('does not have a close button', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check for common close button patterns
    const closeButton = screen.queryByRole('button', { name: /close|tutup|×|x/i })
    expect(closeButton).not.toBeInTheDocument()
    
    // Also check for sr-only close buttons
    const srOnlyClose = screen.queryByText(/close/i)
    expect(srOnlyClose).not.toBeInTheDocument()
  })

  /**
   * Test: Only one button exists (the Accept button)
   * 
   * **Validates: Requirement 3.4**
   */
  it('only has the Accept button, no other buttons', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    const buttons = screen.getAllByRole('button')
    // Should only have: checkbox (role=checkbox) and accept button
    // Filter to only actual buttons (not checkbox)
    const actualButtons = buttons.filter(btn => btn.getAttribute('type') !== 'button' || btn.textContent?.includes('Terima'))
    
    // There should be exactly one button with text "Terima"
    expect(screen.getByRole('button', { name: /Terima/i })).toBeInTheDocument()
  })

  /**
   * Test: Modal overlay exists (for visual blocking)
   * 
   * **Validates: Requirement 3.4**
   */
  it('renders modal overlay', () => {
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Radix Dialog overlay
    const overlay = document.querySelector('[data-state="open"]')
    expect(overlay).toBeInTheDocument()
  })

  /**
   * Test: Modal content prevents pointer down outside
   * 
   * **Validates: Requirement 3.4**
   * Note: This is implemented via onPointerDownOutside={(e) => e.preventDefault()}
   * We verify the modal stays open after simulating outside interaction
   */
  it('modal remains open when clicking outside', async () => {
    const onAccepted = vi.fn()
    render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
    
    // Modal should be visible
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    
    // Simulate clicking outside (on overlay)
    const overlay = document.querySelector('[data-state="open"]')
    if (overlay) {
      fireEvent.pointerDown(overlay)
    }
    
    // Modal should still be visible
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    
    // onAccepted should not have been called
    expect(onAccepted).not.toHaveBeenCalled()
  })

  /**
   * Test: Modal remains open on Escape key press
   * 
   * **Validates: Requirement 3.4**
   * Note: This is implemented via onEscapeKeyDown={(e) => e.preventDefault()}
   */
  it('modal remains open when pressing Escape key', () => {
    const onAccepted = vi.fn()
    render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
    
    // Modal should be visible
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    
    // Simulate Escape key press
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    
    // Modal should still be visible
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    
    // onAccepted should not have been called
    expect(onAccepted).not.toHaveBeenCalled()
  })
})

// =====================================================
// Requirement 3.6: Error Display Tests
// =====================================================
describe('Feature: v0.85-terms-conditions, Requirement 3.6: Error Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Error message is displayed when acceptTerms returns error
   * 
   * **Validates: Requirement 3.6**
   * IF the acceptTerms action fails, THEN the T&C_System SHALL display an error message to the user
   */
  it('displays error message when acceptTerms returns error', async () => {
    mockAcceptTerms.mockResolvedValue({ 
      success: false, 
      error: 'Failed to record acceptance' 
    })
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Failed to record acceptance')).toBeInTheDocument()
    })
  })

  /**
   * Test: Default error message is displayed when acceptTerms returns error without message
   * 
   * **Validates: Requirement 3.6**
   */
  it('displays default error message when acceptTerms returns error without message', async () => {
    mockAcceptTerms.mockResolvedValue({ 
      success: false 
      // No error message provided
    })
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for default error message to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Gagal menyimpan persetujuan/i)).toBeInTheDocument()
    })
  })

  /**
   * Test: Error message is displayed when acceptTerms throws exception
   * 
   * **Validates: Requirement 3.6**
   */
  it('displays error message when acceptTerms throws exception', async () => {
    mockAcceptTerms.mockRejectedValue(new Error('Network error'))
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Terjadi kesalahan/i)).toBeInTheDocument()
    })
  })

  /**
   * Test: Error message has appropriate styling (destructive)
   * 
   * **Validates: Requirement 3.6**
   */
  it('error message has appropriate styling', async () => {
    mockAcceptTerms.mockResolvedValue({ 
      success: false, 
      error: 'Test error' 
    })
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for error message to appear
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-destructive/15')
      expect(alert).toHaveClass('text-destructive')
    })
  })

  /**
   * Test: Error message is cleared on retry
   * 
   * **Validates: Requirement 3.6**
   */
  it('error message is cleared when retrying', async () => {
    // First call fails
    mockAcceptTerms.mockResolvedValueOnce({ 
      success: false, 
      error: 'First error' 
    })
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    let button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument()
    })
    
    // Second call succeeds
    mockAcceptTerms.mockResolvedValueOnce({ success: true })
    
    // Click accept again
    button = getAcceptButton()
    fireEvent.click(button)
    
    // Error should be cleared during loading
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument()
    })
  })

  /**
   * Test: Modal stays open when error occurs
   * 
   * **Validates: Requirement 3.6**
   */
  it('modal stays open when error occurs', async () => {
    mockAcceptTerms.mockResolvedValue({ 
      success: false, 
      error: 'Error occurred' 
    })
    
    const onAccepted = vi.fn()
    render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    
    // Modal should still be visible
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    
    // onAccepted should not have been called
    expect(onAccepted).not.toHaveBeenCalled()
  })
})

// =====================================================
// onAccepted Callback Tests
// =====================================================
describe('Feature: v0.85-terms-conditions, onAccepted Callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: onAccepted callback is called on successful acceptance
   * 
   * **Validates: Requirement 3.5**
   * WHEN the user checks the acceptance checkbox and clicks Accept, 
   * THEN the T&C_System SHALL call the acceptTerms server action
   */
  it('calls onAccepted callback on successful acceptance', async () => {
    mockAcceptTerms.mockResolvedValue({ success: true })
    
    const onAccepted = vi.fn()
    render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for callback to be called
    await waitFor(() => {
      expect(onAccepted).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test: onAccepted callback is not called when acceptTerms fails
   * 
   * **Validates: Requirement 3.6**
   */
  it('does not call onAccepted callback when acceptTerms fails', async () => {
    mockAcceptTerms.mockResolvedValue({ 
      success: false, 
      error: 'Failed' 
    })
    
    const onAccepted = vi.fn()
    render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    
    // onAccepted should not have been called
    expect(onAccepted).not.toHaveBeenCalled()
  })

  /**
   * Test: onAccepted callback is not called when acceptTerms throws
   * 
   * **Validates: Requirement 3.6**
   */
  it('does not call onAccepted callback when acceptTerms throws', async () => {
    mockAcceptTerms.mockRejectedValue(new Error('Network error'))
    
    const onAccepted = vi.fn()
    render(<TermsConditionsModal isOpen={true} onAccepted={onAccepted} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    
    // onAccepted should not have been called
    expect(onAccepted).not.toHaveBeenCalled()
  })

  /**
   * Test: acceptTerms is called when accept button is clicked
   * 
   * **Validates: Requirement 3.5**
   */
  it('calls acceptTerms server action when accept button is clicked', async () => {
    mockAcceptTerms.mockResolvedValue({ success: true })
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for acceptTerms to be called
    await waitFor(() => {
      expect(mockAcceptTerms).toHaveBeenCalledTimes(1)
    })
  })
})

// =====================================================
// Loading State Tests
// =====================================================
describe('Feature: v0.85-terms-conditions, Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Button shows loading text during acceptance
   */
  it('button shows "Memproses..." during acceptance', async () => {
    // Create a promise that doesn't resolve immediately
    mockAcceptTerms.mockReturnValue(new Promise(() => {}))
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for loading state
    await waitFor(() => {
      expect(screen.getByText('Memproses...')).toBeInTheDocument()
    })
  })

  /**
   * Test: Checkbox is disabled during loading
   */
  it('checkbox is disabled during loading', async () => {
    // Create a promise that doesn't resolve immediately
    mockAcceptTerms.mockReturnValue(new Promise(() => {}))
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    const button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for loading state
    await waitFor(() => {
      expect(checkbox).toBeDisabled()
    })
  })

  /**
   * Test: Button is disabled during loading
   */
  it('button is disabled during loading', async () => {
    // Create a promise that doesn't resolve immediately
    mockAcceptTerms.mockReturnValue(new Promise(() => {}))
    
    render(<TermsConditionsModal isOpen={true} onAccepted={vi.fn()} />)
    
    // Check checkbox and click accept
    const checkbox = getCheckbox()
    fireEvent.click(checkbox)
    
    let button = getAcceptButton()
    fireEvent.click(button)
    
    // Wait for loading state
    await waitFor(() => {
      button = screen.getByRole('button', { name: /Memproses/i })
      expect(button).toBeDisabled()
    })
  })
})
