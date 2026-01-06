'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Loader2, Settings, Clock, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutWithLogging } from '@/app/actions/auth-actions'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'
import { GlobalSearch } from '@/components/search/global-search'
import { ContextualHelpPopover } from '@/components/help-center/contextual-help-popover'

export interface UserInfo {
  name: string
  email: string
  avatarUrl: string | null
  role?: string
}

interface HeaderProps {
  user?: UserInfo | null
}

export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    // Use server action that records logout before signing out (Requirement 3.2)
    const result = await signOutWithLogging()
    if (result.success) {
      router.push('/login')
    } else {
      console.error('Sign out failed:', result.error)
      setIsLoggingOut(false)
    }
  }

  const showFallback = !user?.avatarUrl || avatarError

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-4">
        <ContextualHelpPopover userRole={user?.role || 'viewer'} />
        <NotificationDropdown />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <span className="text-sm font-medium">{user.name}</span>
                {showFallback ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {getInitials(user.name)}
                  </div>
                ) : (
                  <img
                    src={user.avatarUrl!}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                    onError={() => setAvatarError(true)}
                  />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/hr/my-attendance" className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  My Attendance
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/hr/my-leave" className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  My Leave
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/preferences" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive"
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!user && (
          <div className="h-8 w-8 rounded-full bg-muted" />
        )}
      </div>
    </header>
  )
}
