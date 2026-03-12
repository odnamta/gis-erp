'use client'

// =====================================================
// v0.84: REQUEST ACCESS CLIENT
// =====================================================
// Requirements: 1.2, 1.3
// - Display welcome message and form
// - Department dropdown with all departments
// - Role dropdown filtered by selected department
// - Optional reason textarea
// - Submit button with loading state

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getDepartmentRoles } from '@/lib/permissions'
import { RoleRequest, Department } from '@/types/role-request'
import { submitRoleRequest } from './actions'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Clock, XCircle, Send } from 'lucide-react'
import { UserRole } from '@/types/permissions'

// =====================================================
// TYPES
// =====================================================

interface RequestAccessClientProps {
  userEmail: string
  userName: string | null
  existingRequest: RoleRequest | null
}

interface RequestFormState {
  department: string
  role: string
  reason: string
  isSubmitting: boolean
  error: string | null
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * All available departments for the role request form
 */
const DEPARTMENTS: Department[] = [
  'Operations',
  'Finance',
  'Marketing',
  'HR',
  'HSE',
  'Engineering',
  'Agency',
  'Customs',
  'Administration',
]

/**
 * Human-readable role labels
 */
const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  director: 'Director',
  marketing_manager: 'Marketing Manager',
  finance_manager: 'Finance Manager',
  operations_manager: 'Operations Manager',
  sysadmin: 'System Administrator',
  administration: 'Administration Staff',
  finance: 'Finance Staff',
  marketing: 'Marketing Staff',
  ops: 'Operations Staff',
  engineer: 'Engineer',
  hr: 'HR Staff',
  hse: 'HSE Staff',
  agency: 'Agency Staff',
  customs: 'Customs Staff',
}

// =====================================================
// REQUEST STATUS DISPLAY COMPONENT
// =====================================================

interface RequestStatusDisplayProps {
  request: RoleRequest
  onResubmit: () => void
}

/**
 * Displays the status of an existing role request
 * Shows pending status, rejection reason, or approved state
 * 
 * Requirements: 2.1, 2.2
 */
function RequestStatusDisplay({ request, onResubmit }: RequestStatusDisplayProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      title: 'Request Pending',
      description: 'Your access request is being reviewed by an administrator.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    approved: {
      icon: CheckCircle,
      title: 'Request Approved',
      description: 'Your access request has been approved. Redirecting to dashboard...',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    rejected: {
      icon: XCircle,
      title: 'Request Rejected',
      description: 'Your access request was not approved.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  }

  const config = statusConfig[request.status]
  const StatusIcon = config.icon

  return (
    <Card className={`${config.bgColor} ${config.borderColor}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-6 w-6 ${config.color}`} />
          <div>
            <CardTitle className={config.color}>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Department:</span>
            <span className="font-medium">{request.requested_department || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Requested Role:</span>
            <span className="font-medium">
              {ROLE_LABELS[request.requested_role] || request.requested_role}
            </span>
          </div>
          {request.reason && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reason:</span>
              <span className="font-medium text-right max-w-[200px]">{request.reason}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Submitted:</span>
            <span className="font-medium">
              {new Date(request.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Show rejection reason and allow resubmission */}
        {request.status === 'rejected' && (
          <div className="space-y-4 pt-4 border-t">
            {request.admin_notes && (
              <div className="rounded-md bg-red-100 p-3">
                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                <p className="text-sm text-red-700 mt-1">{request.admin_notes}</p>
              </div>
            )}
            <Button onClick={onResubmit} className="w-full">
              Submit New Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * Client component for the Request Access page
 * Displays the role request form or existing request status
 * 
 * Requirements: 1.2, 1.3
 */
export function RequestAccessClient({
  userEmail,
  userName,
  existingRequest,
}: RequestAccessClientProps) {
  // Form state
  const [formState, setFormState] = useState<RequestFormState>({
    department: '',
    role: '',
    reason: '',
    isSubmitting: false,
    error: null,
  })

  // Track if user wants to resubmit after rejection
  const [showForm, setShowForm] = useState(!existingRequest || existingRequest.status === 'rejected')

  // Get available roles for selected department
  const availableRoles = formState.department 
    ? getDepartmentRoles(formState.department)
    : []

  /**
   * Handle department selection change
   * Resets role selection when department changes
   */
  const handleDepartmentChange = (department: string) => {
    setFormState(prev => ({
      ...prev,
      department,
      role: '', // Reset role when department changes
      error: null,
    }))
  }

  /**
   * Handle role selection change
   */
  const handleRoleChange = (role: string) => {
    setFormState(prev => ({
      ...prev,
      role,
      error: null,
    }))
  }

  /**
   * Handle reason textarea change
   */
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState(prev => ({
      ...prev,
      reason: e.target.value,
      error: null,
    }))
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formState.department) {
      setFormState(prev => ({ ...prev, error: 'Please select a department' }))
      return
    }

    if (!formState.role) {
      setFormState(prev => ({ ...prev, error: 'Please select a role' }))
      return
    }

    // Submit request
    setFormState(prev => ({ ...prev, isSubmitting: true, error: null }))

    try {
      const result = await submitRoleRequest({
        requestedDepartment: formState.department,
        requestedRole: formState.role,
        reason: formState.reason || undefined,
      })

      if (result.success) {
        toast.success('Access request submitted successfully')
        // Reset form and hide it to show status
        setFormState({
          department: '',
          role: '',
          reason: '',
          isSubmitting: false,
          error: null,
        })
        setShowForm(false)
        // Page will revalidate and show the pending status
      } else {
        setFormState(prev => ({
          ...prev,
          isSubmitting: false,
          error: result.error || 'Failed to submit request',
        }))
        toast.error(result.error || 'Failed to submit request')
      }
    } catch {
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        error: 'An unexpected error occurred',
      }))
      toast.error('An unexpected error occurred')
    }
  }

  /**
   * Handle resubmission after rejection
   */
  const handleResubmit = () => {
    setShowForm(true)
  }

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Request Access</h1>
          <p className="text-muted-foreground">
            Welcome{userName ? `, ${userName}` : ''}! Request access to GAMA ERP.
          </p>
        </div>

        {/* User Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {(userName || userEmail).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{userName || 'User'}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Show existing request status or form */}
        {existingRequest && !showForm ? (
          <RequestStatusDisplay 
            request={existingRequest} 
            onResubmit={handleResubmit}
          />
        ) : (
          /* Request Form */
          <Card>
            <CardHeader>
              <CardTitle>Request Role Access</CardTitle>
              <CardDescription>
                Select your department and role to request access to the system.
                An administrator will review your request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Department Selection */}
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formState.department}
                    onValueChange={handleDepartmentChange}
                    disabled={formState.isSubmitting}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formState.role}
                    onValueChange={handleRoleChange}
                    disabled={formState.isSubmitting || !formState.department}
                  >
                    <SelectTrigger id="role">
                      <SelectValue 
                        placeholder={
                          formState.department 
                            ? "Select your role" 
                            : "Select a department first"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.length === 0 ? (
                        <SelectItem value="__no_roles__" disabled>
                          No roles available
                        </SelectItem>
                      ) : (
                        availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role] || role}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formState.department && availableRoles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Available roles for {formState.department} department
                    </p>
                  )}
                </div>

                {/* Reason Textarea */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Briefly describe why you need access to this role..."
                    value={formState.reason}
                    onChange={handleReasonChange}
                    disabled={formState.isSubmitting}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps administrators understand your access needs
                  </p>
                </div>

                {/* Error Message */}
                {formState.error && (
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{formState.error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={formState.isSubmitting || !formState.department || !formState.role}
                >
                  {formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground">
          Need help? Contact your system administrator.
        </p>
      </div>
    </div>
  )
}
