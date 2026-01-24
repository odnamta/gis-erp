/**
 * Feature: v0.85-terms-conditions
 * Integration Tests for Layout T&C Integration
 * 
 * Tests for TermsConditionsWrapper component which handles the modal logic
 * in the main layout. Since the actual layout is a server component,
 * we test the client wrapper component which handles the modal display.
 * 
 * **Validates: Requirements 5.2, 5.3, 5.4**
 * - 5.2: IF the user's tc_version matches the current TERMS_VERSION, THEN the T&C_Modal SHALL NOT be displayed
 * - 5.3: IF the user's tc_version does not match the current TERMS_VERSION, THEN the T&C_Modal SHALL be displayed
 * - 5.4: IF the user's tc_accepted_at is NULL, THEN the T&C_Modal SHALL be displayed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { TermsConditionsWrapper } from '@/components/terms-conditions-wrapper'

// =====================================================
// MOCKS
// =====================================================

// Mock next/navigation
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

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
 * Test children component to verify rendering
 */
function TestChildren() {
  return (
    <div data-testid="test-children">
      <h1>Dashboard Content</h1>
      <p>This is the main application content</p>
    </div>
  )
}

/**
 * Get the Accept button element
 */
function getAcceptButton(): HTMLButtonElement | null {
  return screen.queryByRole('button', { name: /Terima|Memproses/i }) as HTMLButtonElement | null
}

/**
 * Get the checkbox element
 */
function getCheckbox(): HTMLButtonElement | null {
  return screen.queryByRole('checkbox') as HTMLButtonElement | null
}

// =====================================================
// Requirement 5.4: Modal shown for users without acceptance (NULL tc_accepted_at)
// =====================================================
describe('Feature: v0.85-terms-conditions, Requirement 5.4: Modal shown for users without acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Modal is shown when needsAcceptance is true (user has NULL tc_accepted_at)
   * 
   * **Validates: Requirement 5.4**
   * IF the user's tc_accepted_at is NULL, THEN the T&C_Modal SHALL be displayed
   */
  it('shows modal when needsAcceptance is true (user has not accepted T&C)', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Modal should be visible
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
    expect(getCheckbox()).toBeInTheDocument()
    expect(getAcceptButton()).toBeInTheDocument()
  })

  /**
   * Test: Children are still rendered when modal is shown
   * 
   * **Validates: Requirement 5.5**
   * WHILE the T&C_Modal is displayed, THE T&C_System SHALL prevent access to other system features
   * (Children are rendered but blocked by modal overlay)
   */
  it('renders children even when modal is shown (blocked by overlay)', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Children should be in the DOM (but blocked by modal overlay)
    expect(screen.getByTestId('test-children')).toBeInTheDocument()
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
  })

  /**
   * Test: Modal overlay blocks interaction with children
   * 
   * **Validates: Requirement 5.5**
   * WHILE the T&C_Modal is displayed, THE T&C_System SHALL prevent access to other system features
   */
  it('modal overlay is present to block interaction', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Modal overlay should be present (data-state="open" on overlay)
    const overlay = document.querySelector('[data-state="open"]')
    expect(overlay).toBeInTheDocument()
  })
})

// =====================================================
// Requirement 5.2: Modal NOT shown for users with current version
// =====================================================
describe('Feature: v0.85-terms-conditions, Requirement 5.2: Modal not shown for users with current version', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Modal is NOT shown when needsAcceptance is false (user has current version)
   * 
   * **Validates: Requirement 5.2**
   * IF the user's tc_version matches the current TERMS_VERSION, THEN the T&C_Modal SHALL NOT be displayed
   */
  it('does not show modal when needsAcceptance is false (user has accepted current version)', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={false}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Modal should NOT be visible
    expect(screen.queryByText('Syarat dan Ketentuan')).not.toBeInTheDocument()
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument()
    expect(getCheckbox()).not.toBeInTheDocument()
    expect(getAcceptButton()).not.toBeInTheDocument()
  })

  /**
   * Test: Children are rendered and accessible when modal is not shown
   * 
   * **Validates: Requirement 5.2**
   */
  it('renders children normally when needsAcceptance is false', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={false}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Children should be visible and accessible
    expect(screen.getByTestId('test-children')).toBeInTheDocument()
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    expect(screen.getByText('This is the main application content')).toBeInTheDocument()
  })

  /**
   * Test: No modal overlay when needsAcceptance is false
   * 
   * **Validates: Requirement 5.2**
   */
  it('no modal overlay when needsAcceptance is false', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={false}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // No modal overlay should be present
    // The dialog with data-state="open" should not exist
    const modalContent = document.querySelector('[role="dialog"]')
    expect(modalContent).not.toBeInTheDocument()
  })
})

// =====================================================
// Requirement 5.3: Modal shown for users with outdated version
// =====================================================
describe('Feature: v0.85-terms-conditions, Requirement 5.3: Modal shown for users with outdated version', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Modal is shown when needsAcceptance is true (user has outdated version)
   * 
   * **Validates: Requirement 5.3**
   * IF the user's tc_version does not match the current TERMS_VERSION, THEN the T&C_Modal SHALL be displayed
   * 
   * Note: The needsAcceptance prop is calculated in the server component using hasAcceptedCurrentTerms.
   * When tc_version doesn't match TERMS_VERSION, needsAcceptance will be true.
   */
  it('shows modal when needsAcceptance is true (user has outdated version)', () => {
    // needsAcceptance=true simulates a user with outdated tc_version
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Modal should be visible
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    expect(screen.getByText(/Harap baca dan setujui syarat dan ketentuan/i)).toBeInTheDocument()
  })

  /**
   * Test: User must re-accept terms when version is outdated
   * 
   * **Validates: Requirement 5.3, 2.4**
   * WHEN TERMS_VERSION is updated, THEN all users SHALL be required to re-accept the new terms
   */
  it('requires user to accept terms again when version is outdated', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Accept button should be present and initially disabled
    const acceptButton = getAcceptButton()
    expect(acceptButton).toBeInTheDocument()
    expect(acceptButton).toBeDisabled()
    
    // Checkbox should be present and unchecked
    const checkbox = getCheckbox()
    expect(checkbox).toBeInTheDocument()
    expect(checkbox?.getAttribute('data-state')).toBe('unchecked')
  })
})

// =====================================================
// Requirement 5.6: onAccepted callback triggers router.refresh()
// =====================================================
describe('Feature: v0.85-terms-conditions, Requirement 5.6: onAccepted callback triggers router.refresh()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: router.refresh() is called when user accepts terms
   * 
   * **Validates: Requirement 5.6**
   * WHEN the user successfully accepts T&C, THEN the T&C_Modal SHALL close and the user SHALL access the system normally
   */
  it('calls router.refresh() when user accepts terms', async () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Check checkbox
    const checkbox = getCheckbox()!
    fireEvent.click(checkbox)
    
    // Click accept button
    const acceptButton = getAcceptButton()!
    fireEvent.click(acceptButton)
    
    // Wait for acceptance to complete
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test: Modal closes after successful acceptance
   * 
   * **Validates: Requirement 5.6**
   * WHEN the user successfully accepts T&C, THEN the T&C_Modal SHALL close
   */
  it('modal closes after successful acceptance', async () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Modal should be visible initially
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    
    // Check checkbox
    const checkbox = getCheckbox()!
    fireEvent.click(checkbox)
    
    // Click accept button
    const acceptButton = getAcceptButton()!
    fireEvent.click(acceptButton)
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText('Syarat dan Ketentuan')).not.toBeInTheDocument()
    })
  })

  /**
   * Test: acceptTerms server action is called when accepting
   * 
   * **Validates: Requirement 3.5**
   * WHEN the user checks the acceptance checkbox and clicks Accept, 
   * THEN the T&C_System SHALL call the acceptTerms server action
   */
  it('calls acceptTerms server action when accepting', async () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Check checkbox
    const checkbox = getCheckbox()!
    fireEvent.click(checkbox)
    
    // Click accept button
    const acceptButton = getAcceptButton()!
    fireEvent.click(acceptButton)
    
    // Wait for acceptTerms to be called
    await waitFor(() => {
      expect(mockAcceptTerms).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test: router.refresh() is NOT called when acceptTerms fails
   * 
   * **Validates: Requirement 3.6**
   * IF the acceptTerms action fails, THEN the T&C_System SHALL display an error message to the user
   */
  it('does not call router.refresh() when acceptTerms fails', async () => {
    mockAcceptTerms.mockResolvedValue({ 
      success: false, 
      error: 'Failed to record acceptance' 
    })
    
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Check checkbox
    const checkbox = getCheckbox()!
    fireEvent.click(checkbox)
    
    // Click accept button
    const acceptButton = getAcceptButton()!
    fireEvent.click(acceptButton)
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    
    // router.refresh() should NOT have been called
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  /**
   * Test: Modal stays open when acceptTerms fails
   * 
   * **Validates: Requirement 3.6**
   */
  it('modal stays open when acceptTerms fails', async () => {
    mockAcceptTerms.mockResolvedValue({ 
      success: false, 
      error: 'Failed to record acceptance' 
    })
    
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Check checkbox
    const checkbox = getCheckbox()!
    fireEvent.click(checkbox)
    
    // Click accept button
    const acceptButton = getAcceptButton()!
    fireEvent.click(acceptButton)
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    
    // Modal should still be visible
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
  })
})

// =====================================================
// Children Rendering Tests
// =====================================================
describe('Feature: v0.85-terms-conditions, Children Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Children are rendered in both cases (needsAcceptance true and false)
   */
  it('renders children when needsAcceptance is true', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    expect(screen.getByTestId('test-children')).toBeInTheDocument()
  })

  it('renders children when needsAcceptance is false', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={false}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    expect(screen.getByTestId('test-children')).toBeInTheDocument()
  })

  /**
   * Test: Complex children are rendered correctly
   */
  it('renders complex children correctly', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={false}>
        <div data-testid="complex-children">
          <header>Header</header>
          <nav>Navigation</nav>
          <main>
            <section>Section 1</section>
            <section>Section 2</section>
          </main>
          <footer>Footer</footer>
        </div>
      </TermsConditionsWrapper>
    )
    
    expect(screen.getByTestId('complex-children')).toBeInTheDocument()
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Section 1')).toBeInTheDocument()
    expect(screen.getByText('Section 2')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  /**
   * Test: Multiple children are rendered
   */
  it('renders multiple children elements', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={false}>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </TermsConditionsWrapper>
    )
    
    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByTestId('child-3')).toBeInTheDocument()
  })
})

// =====================================================
// State Management Tests
// =====================================================
describe('Feature: v0.85-terms-conditions, State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Initial state reflects needsAcceptance prop
   */
  it('initial modal state reflects needsAcceptance=true prop', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Modal should be open
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
  })

  it('initial modal state reflects needsAcceptance=false prop', () => {
    render(
      <TermsConditionsWrapper needsAcceptance={false}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Modal should be closed
    expect(screen.queryByText('Syarat dan Ketentuan')).not.toBeInTheDocument()
  })

  /**
   * Test: Modal state updates after acceptance
   */
  it('modal state updates from open to closed after acceptance', async () => {
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    // Modal should be open initially
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
    
    // Accept terms
    const checkbox = getCheckbox()!
    fireEvent.click(checkbox)
    
    const acceptButton = getAcceptButton()!
    fireEvent.click(acceptButton)
    
    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Syarat dan Ketentuan')).not.toBeInTheDocument()
    })
  })
})

// =====================================================
// Integration with hasAcceptedCurrentTerms (via needsAcceptance prop)
// =====================================================
describe('Feature: v0.85-terms-conditions, Integration with hasAcceptedCurrentTerms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcceptTerms.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Test: Simulates layout behavior for new user (tc_accepted_at = NULL)
   * 
   * In the actual layout:
   * const needsTCAcceptance = !hasAcceptedCurrentTerms(null, null) // returns true
   * 
   * **Validates: Requirement 5.4, 6.1**
   */
  it('simulates new user scenario (tc_accepted_at = NULL) - modal shown', () => {
    // hasAcceptedCurrentTerms(null, null) returns false
    // So needsAcceptance would be true
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
  })

  /**
   * Test: Simulates layout behavior for user with current version
   * 
   * In the actual layout:
   * const needsTCAcceptance = !hasAcceptedCurrentTerms('2026-01-25T10:00:00Z', '1.0.0') // returns false
   * 
   * **Validates: Requirement 5.2**
   */
  it('simulates user with current version scenario - modal not shown', () => {
    // hasAcceptedCurrentTerms('2026-01-25T10:00:00Z', '1.0.0') returns true
    // So needsAcceptance would be false
    render(
      <TermsConditionsWrapper needsAcceptance={false}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    expect(screen.queryByText('Syarat dan Ketentuan')).not.toBeInTheDocument()
  })

  /**
   * Test: Simulates layout behavior for user with outdated version
   * 
   * In the actual layout:
   * const needsTCAcceptance = !hasAcceptedCurrentTerms('2025-01-01T10:00:00Z', '0.9.0') // returns true
   * 
   * **Validates: Requirement 5.3**
   */
  it('simulates user with outdated version scenario - modal shown', () => {
    // hasAcceptedCurrentTerms('2025-01-01T10:00:00Z', '0.9.0') returns false
    // So needsAcceptance would be true
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
  })

  /**
   * Test: Simulates layout behavior for user with NULL tc_version
   * 
   * In the actual layout:
   * const needsTCAcceptance = !hasAcceptedCurrentTerms('2026-01-25T10:00:00Z', null) // returns true
   * 
   * **Validates: Requirement 5.4**
   */
  it('simulates user with NULL tc_version scenario - modal shown', () => {
    // hasAcceptedCurrentTerms('2026-01-25T10:00:00Z', null) returns false
    // So needsAcceptance would be true
    render(
      <TermsConditionsWrapper needsAcceptance={true}>
        <TestChildren />
      </TermsConditionsWrapper>
    )
    
    expect(screen.getByText('Syarat dan Ketentuan')).toBeInTheDocument()
  })
})
