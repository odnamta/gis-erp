'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/components/providers/permission-provider'
import { isFieldHidden, isModuleHidden } from '@/lib/field-mask'
import { UserRole } from '@/types/permissions'

interface FieldMaskProps {
  /** The module this field belongs to (e.g., 'job_orders', 'invoices') */
  module: string
  /** The field name to check (e.g., 'total_revenue', 'profit') */
  field: string
  /** Content to show when field is visible */
  children: ReactNode
  /** Optional fallback content when field is hidden */
  fallback?: ReactNode
  /** Optional: Override role check (useful for server-side rendering) */
  role?: UserRole
}

/**
 * Component that conditionally renders content based on field visibility rules
 * Uses the field-mask utility to determine if a field should be hidden for the current user's role
 */
export function FieldMask({ module, field, children, fallback = null, role }: FieldMaskProps) {
  const { profile } = usePermissions()
  
  const userRole = role || profile?.role
  
  if (!userRole) {
    // If no role available, hide by default for security
    return <>{fallback}</>
  }
  
  if (isFieldHidden(userRole, module, field)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface ModuleMaskProps {
  /** The module to check (e.g., 'invoices', 'payments') */
  module: string
  /** Content to show when module is visible */
  children: ReactNode
  /** Optional fallback content when module is hidden */
  fallback?: ReactNode
  /** Optional: Override role check */
  role?: UserRole
}

/**
 * Component that conditionally renders content based on module visibility
 * Hides entire module content if the user's role doesn't have access
 */
export function ModuleMask({ module, children, fallback = null, role }: ModuleMaskProps) {
  const { profile } = usePermissions()
  
  const userRole = role || profile?.role
  
  if (!userRole) {
    return <>{fallback}</>
  }
  
  if (isModuleHidden(userRole, module)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface MaskedValueProps {
  /** The module this value belongs to */
  module: string
  /** The field name */
  field: string
  /** The actual value to display */
  value: ReactNode
  /** What to show when masked (default: '***') */
  maskedDisplay?: ReactNode
  /** Optional: Override role check */
  role?: UserRole
}

/**
 * Component that shows a masked placeholder when field is hidden
 * Useful for showing that a value exists but is restricted
 */
export function MaskedValue({ 
  module, 
  field, 
  value, 
  maskedDisplay = <span className="text-muted-foreground">***</span>,
  role 
}: MaskedValueProps) {
  const { profile } = usePermissions()
  
  const userRole = role || profile?.role
  
  if (!userRole || isFieldHidden(userRole, module, field)) {
    return <>{maskedDisplay}</>
  }
  
  return <>{value}</>
}

interface ConditionalFieldProps {
  /** The module this field belongs to */
  module: string
  /** The field name */
  field: string
  /** Render function that receives visibility status */
  children: (isVisible: boolean) => ReactNode
  /** Optional: Override role check */
  role?: UserRole
}

/**
 * Component that provides visibility status to children
 * Useful when you need more control over how hidden fields are handled
 */
export function ConditionalField({ module, field, children, role }: ConditionalFieldProps) {
  const { profile } = usePermissions()
  
  const userRole = role || profile?.role
  const isVisible = userRole ? !isFieldHidden(userRole, module, field) : false
  
  return <>{children(isVisible)}</>
}
