import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { PreviewProvider, usePreviewContext } from '@/contexts/preview-context'
import { getDefaultPermissions } from '@/lib/permissions'
import { PREVIEW_ROLES } from '@/lib/preview-utils'
import { UserRole } from '@/types/permissions'
import { ReactNode } from 'react'

const ALL_ROLES: UserRole[] = ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'sysadmin', 'administration', 'finance', 'marketing', 'ops', 'engineer', 'hr', 'hse']
const NON_OWNER_ROLES: UserRole[] = ['director', 'marketing_manager', 'finance_manager', 'operations_manager', 'sysadmin', 'administration', 'finance', 'marketing', 'ops', 'engineer', 'hr', 'hse']

const roleArb = fc.constantFrom(...ALL_ROLES)
const nonOwnerRoleArb = fc.constantFrom(...NON_OWNER_ROLES)
const previewRoleArb = fc.constantFrom(...PREVIEW_ROLES)

function createWrapper(actualRole: UserRole) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PreviewProvider
        actualRole={actualRole}
        actualPermissions={getDefaultPermissions(actualRole)}
      >
        {children}
      </PreviewProvider>
    )
  }
}

describe('PreviewContext', () => {
  /**
   * Property 2: Preview role selection updates effective role
   * **Feature: v0.9.7-role-preview, Property 2: Preview role selection updates effective role**
   * *For any* preview role selected by the Owner, the effectiveRole SHALL equal the selected preview role
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Preview role selection updates effective role', () => {
    it('should update effectiveRole when owner selects a preview role', () => {
      fc.assert(
        fc.property(previewRoleArb, (previewRole) => {
          const { result } = renderHook(() => usePreviewContext(), {
            wrapper: createWrapper('owner'),
          })

          act(() => {
            result.current.setPreviewRole(previewRole)
          })

          expect(result.current.effectiveRole).toBe(previewRole)
          expect(result.current.isPreviewActive).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should not update effectiveRole for non-owner users', () => {
      fc.assert(
        fc.property(nonOwnerRoleArb, previewRoleArb, (actualRole, previewRole) => {
          const { result } = renderHook(() => usePreviewContext(), {
            wrapper: createWrapper(actualRole),
          })

          act(() => {
            result.current.setPreviewRole(previewRole)
          })

          // Non-owner should keep their actual role
          expect(result.current.effectiveRole).toBe(actualRole)
          expect(result.current.isPreviewActive).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 8: Initial preview state is null
   * **Feature: v0.9.7-role-preview, Property 8: Initial preview state is null**
   * *For any* new PreviewContext instance, the initial previewRole SHALL be null
   * **Validates: Requirements 6.2**
   */
  describe('Property 8: Initial preview state is null', () => {
    it('should have null previewRole and false isPreviewActive initially', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const { result } = renderHook(() => usePreviewContext(), {
            wrapper: createWrapper(role),
          })

          expect(result.current.previewRole).toBeNull()
          expect(result.current.isPreviewActive).toBe(false)
          expect(result.current.effectiveRole).toBe(role)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('canUsePreview', () => {
    it('should be true only for owner', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const { result } = renderHook(() => usePreviewContext(), {
            wrapper: createWrapper(role),
          })

          if (role === 'owner') {
            expect(result.current.canUsePreview).toBe(true)
          } else {
            expect(result.current.canUsePreview).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('effectivePermissions', () => {
    it('should match preview role permissions when owner previews', () => {
      fc.assert(
        fc.property(previewRoleArb, (previewRole) => {
          const { result } = renderHook(() => usePreviewContext(), {
            wrapper: createWrapper('owner'),
          })

          act(() => {
            result.current.setPreviewRole(previewRole)
          })

          const expectedPermissions = getDefaultPermissions(previewRole)
          expect(result.current.effectivePermissions).toEqual(expectedPermissions)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('error handling', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => usePreviewContext())
      }).toThrow('usePreviewContext must be used within a PreviewProvider')
    })
  })
})
