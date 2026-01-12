'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UserRole } from '@/types/permissions'
import { PREVIEW_ROLES, getRoleDisplayName } from '@/lib/preview-utils'
import { getDashboardPath } from '@/lib/navigation'
import { Eye, X } from 'lucide-react'

interface PreviewDropdownProps {
  currentRole: UserRole
  actualRole: UserRole
  onRoleSelect: (role: UserRole | null) => void
  canUsePreview: boolean
  isPreviewActive: boolean
}

export function PreviewDropdown({
  currentRole,
  actualRole,
  onRoleSelect,
  canUsePreview,
  isPreviewActive,
}: PreviewDropdownProps) {
  const router = useRouter()

  if (!canUsePreview) {
    return null
  }

  const handleRoleSelect = (value: string) => {
    const selectedRole = value as UserRole

    // Update the preview state
    onRoleSelect(selectedRole)

    // Navigate to the appropriate dashboard for the selected role
    const dashboardPath = getDashboardPath(selectedRole)
    router.push(dashboardPath)
  }

  const handleExitPreview = () => {
    // Clear preview
    onRoleSelect(null)

    // Navigate back to actual role dashboard
    const dashboardPath = getDashboardPath(actualRole)
    router.push(dashboardPath)
  }

  return (
    <div className="flex items-center gap-2">
      <Eye className={`h-4 w-4 ${isPreviewActive ? 'text-orange-500' : 'text-muted-foreground'}`} />
      <span className={`text-sm ${isPreviewActive ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-muted-foreground'}`}>
        Preview as:
      </span>
      <Select
        value={currentRole}
        onValueChange={handleRoleSelect}
      >
        <SelectTrigger className={`w-[200px] h-8 ${isPreviewActive ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {PREVIEW_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {getRoleDisplayName(role)}
              {role === actualRole && ' (actual)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPreviewActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExitPreview}
          className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950/40"
        >
          <X className="h-4 w-4 mr-1" />
          Exit Preview
        </Button>
      )}
    </div>
  )
}
