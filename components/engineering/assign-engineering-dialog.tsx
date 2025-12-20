'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  full_name?: string | null
  role?: string | null
}

interface AssignEngineeringDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pjoId: string
  pjoNumber: string
  onAssign: (userId: string) => Promise<{ error?: string }>
}

export function AssignEngineeringDialog({
  open,
  onOpenChange,
  pjoId,
  pjoNumber,
  onAssign,
}: AssignEngineeringDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open])

  const loadUsers = async () => {
    setIsLoadingUsers(true)
    const supabase = createClient()
    
    // Fetch users who can do engineering work (engineers and managers)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role')
      .in('role', ['engineer', 'engineering', 'manager', 'super_admin', 'admin', 'owner'])
      .eq('is_active', true)
      .order('full_name')

    setIsLoadingUsers(false)

    if (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
      return
    }

    setUsers(data || [])
  }

  const handleSubmit = async () => {
    if (!selectedUserId) {
      setError('Please select a user to assign')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await onAssign(selectedUserId)

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      resetForm()
      onOpenChange(false)
    }
  }

  const resetForm = () => {
    setSelectedUserId('')
    setError(null)
  }

  const getUserDisplayName = (user: User) => {
    if (user.full_name) {
      return `${user.full_name} (${user.email})`
    }
    return user.email
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Engineering Review
          </DialogTitle>
          <DialogDescription>
            Assign an engineer to review PJO {pjoNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user">Assign To *</Label>
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {getUserDisplayName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {users.length === 0 && !isLoadingUsers && (
              <p className="text-sm text-muted-foreground">
                No eligible users found. Users with engineer or manager roles can be assigned.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedUserId}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
