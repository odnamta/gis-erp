'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { UserProfile, UserRole } from '@/types/permissions'
import { DEFAULT_PERMISSIONS, getAssignableRoles, isPendingUser } from '@/lib/permissions'
import { updateUserRoleAction, createPreregisteredUserAction, toggleUserActiveAction } from './actions'
import { Pencil, Shield, ShieldCheck, ShieldX, UserPlus, Crown, Clock } from 'lucide-react'

interface UserManagementClientProps {
  users: UserProfile[]
  currentUserId: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  director: 'Director',
  marketing_manager: 'Marketing Manager',
  finance_manager: 'Finance Manager',
  operations_manager: 'Operations Manager',
  sysadmin: 'System Administrator',
  administration: 'Administration',
  finance: 'Finance',
  marketing: 'Marketing',
  ops: 'Operations',
  engineer: 'Engineer',
  hr: 'Human Resources',
  hse: 'Health, Safety & Environment',
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-amber-100 text-amber-800',
  director: 'bg-indigo-100 text-indigo-800',
  marketing_manager: 'bg-pink-100 text-pink-800',
  finance_manager: 'bg-purple-100 text-purple-800',
  operations_manager: 'bg-green-100 text-green-800',
  sysadmin: 'bg-red-100 text-red-800',
  administration: 'bg-orange-100 text-orange-800',
  finance: 'bg-purple-100 text-purple-800',
  marketing: 'bg-pink-100 text-pink-800',
  ops: 'bg-green-100 text-green-800',
  engineer: 'bg-cyan-100 text-cyan-800',
  hr: 'bg-teal-100 text-teal-800',
  hse: 'bg-yellow-100 text-yellow-800',
}

export function UserManagementClient({ users, currentUserId }: UserManagementClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>('ops')
  const [customPermissions, setCustomPermissions] = useState({
    can_see_revenue: false,
    can_see_profit: false,
    can_approve_pjo: false,
    can_manage_invoices: false,
    can_manage_users: false,
    can_create_pjo: false,
    can_fill_costs: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Add user dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState<UserRole>('ops')

  const assignableRoles = getAssignableRoles()

  const handleEditUser = (user: UserProfile) => {
    // Cannot edit owner
    if (user.role === 'owner') {
      toast({
        title: 'Cannot edit',
        description: 'Owner account cannot be modified',
        variant: 'destructive',
      })
      return
    }
    
    setEditingUser(user)
    setSelectedRole(user.role as UserRole)
    setCustomPermissions({
      can_see_revenue: user.can_see_revenue,
      can_see_profit: user.can_see_profit,
      can_approve_pjo: user.can_approve_pjo,
      can_manage_invoices: user.can_manage_invoices,
      can_manage_users: user.can_manage_users,
      can_create_pjo: user.can_create_pjo,
      can_fill_costs: user.can_fill_costs,
    })
  }

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role)
    setCustomPermissions(DEFAULT_PERMISSIONS[role])
  }

  const handlePermissionToggle = (permission: keyof typeof customPermissions) => {
    setCustomPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }))
  }

  const handleSave = async () => {
    if (!editingUser) return

    setIsSubmitting(true)
    try {
      const result = await updateUserRoleAction(
        editingUser.user_id!,
        selectedRole,
        customPermissions
      )

      if (result.success) {
        toast({
          title: 'User updated',
          description: `${editingUser.full_name || editingUser.email}'s role has been updated.`,
        })
        setEditingUser(null)
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update user',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUserEmail) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createPreregisteredUserAction(
        newUserEmail,
        newUserName,
        newUserRole
      )

      if (result.success) {
        toast({
          title: 'User added',
          description: `${newUserEmail} has been pre-registered. They can now log in.`,
        })
        setShowAddDialog(false)
        setNewUserEmail('')
        setNewUserName('')
        setNewUserRole('ops')
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add user',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (user: UserProfile) => {
    if (user.role === 'owner') {
      toast({
        title: 'Cannot deactivate',
        description: 'Owner account cannot be deactivated',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await toggleUserActiveAction(user.id, !user.is_active)

      if (result.success) {
        toast({
          title: user.is_active ? 'User deactivated' : 'User activated',
          description: `${user.full_name || user.email} has been ${user.is_active ? 'deactivated' : 'activated'}.`,
        })
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update user status',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                <TableCell className="font-medium">
                  {user.full_name || 'No name'}
                  {user.user_id === currentUserId && (
                    <Badge variant="outline" className="ml-2">
                      You
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge className={ROLE_COLORS[user.role as UserRole]}>
                    {user.role === 'owner' && <Crown className="mr-1 h-3 w-3" />}
                    {ROLE_LABELS[user.role as UserRole] || user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isPendingUser(user) ? (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      <Clock className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  ) : user.is_active ? (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {user.can_see_revenue && (
                      <Badge variant="secondary" className="text-xs">
                        Revenue
                      </Badge>
                    )}
                    {user.can_approve_pjo && (
                      <Badge variant="secondary" className="text-xs">
                        Approve
                      </Badge>
                    )}
                    {user.can_manage_users && (
                      <Badge variant="secondary" className="text-xs">
                        Users
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {user.role !== 'owner' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditUser(user)}
                          disabled={isSubmitting}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => handleToggleActive(user)}
                          disabled={isSubmitting || user.user_id === currentUserId}
                        />
                      </>
                    )}
                    {user.role === 'owner' && (
                      <span className="text-xs text-muted-foreground">Protected</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
            <DialogDescription>
              {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => handleRoleChange(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {role === 'sysadmin' ? (
                          <ShieldCheck className="h-4 w-4 text-red-600" />
                        ) : role === 'ops' ? (
                          <ShieldX className="h-4 w-4 text-gray-600" />
                        ) : (
                          <Shield className="h-4 w-4 text-blue-600" />
                        )}
                        {ROLE_LABELS[role]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Custom Permissions</Label>
              <div className="space-y-3">
                {Object.entries(customPermissions).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="font-normal">
                      {key.replace(/_/g, ' ').replace('can ', 'Can ')}
                    </Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={() => handlePermissionToggle(key as keyof typeof customPermissions)}
                      disabled={
                        key === 'can_manage_users' &&
                        editingUser?.user_id === currentUserId &&
                        value
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Pre-register a user before they log in. They will be able to sign in with Google using this email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name (optional)</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
