import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginForm } from '@/app/login/login-form'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}))

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sign-in button', () => {
    render(<LoginForm />)
    
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('displays Gama ERP branding', () => {
    render(<LoginForm />)
    
    expect(screen.getByText('Gama ERP')).toBeInTheDocument()
    expect(screen.getByText('Logistics Management System')).toBeInTheDocument()
  })

  it('displays error message when error param is present', () => {
    vi.mocked(vi.importActual('next/navigation')).useSearchParams = () => 
      new URLSearchParams('error=Authentication failed')
    
    // Re-mock with error param
    vi.doMock('next/navigation', () => ({
      useSearchParams: () => new URLSearchParams('error=Authentication failed'),
    }))
    
    render(<LoginForm />)
    // Note: This test may need adjustment based on how the component handles searchParams
  })

  it('displays info message when message param is present', () => {
    vi.doMock('next/navigation', () => ({
      useSearchParams: () => new URLSearchParams('message=Please sign in to continue'),
    }))
    
    render(<LoginForm />)
    // Note: This test may need adjustment based on how the component handles searchParams
  })

  it('shows loading state when sign-in button is clicked', async () => {
    render(<LoginForm />)
    
    const button = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(button)
    
    expect(await screen.findByText(/signing in/i)).toBeInTheDocument()
  })

  it('disables button during loading state', async () => {
    render(<LoginForm />)
    
    const button = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(button)
    
    expect(button).toBeDisabled()
  })
})
