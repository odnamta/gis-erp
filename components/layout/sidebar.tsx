'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/components/providers/permission-provider'
import { usePreview } from '@/hooks/use-preview'
import { NAV_ITEMS, filterNavItems } from '@/lib/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Truck, X, Globe, ArrowLeft } from 'lucide-react'
import { ChangelogNotificationDot } from '@/components/changelog/changelog-notification-dot'
import { useMobileSidebar } from './mobile-sidebar-context'

const EXPLORER_KEY = 'gama-explorer-mode'

export function Sidebar() {
  const pathname = usePathname()
  const { profile, isLoading } = usePermissions()
  const { effectiveRole, effectivePermissions, isPreviewActive } = usePreview()
  const { isOpen, close } = useMobileSidebar()
  const [explorerMode, setExplorerMode] = useState(false)

  // Load explorer mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EXPLORER_KEY)
      if (saved === 'true') setExplorerMode(true)
    } catch {}
  }, [])

  const toggleExplorer = useCallback(() => {
    setExplorerMode(prev => {
      const next = !prev
      try { localStorage.setItem(EXPLORER_KEY, String(next)) } catch {}
      return next
    })
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    close()
  }, [pathname, close])

  // In explorer mode, show ALL nav items. Otherwise filter by role.
  const filteredNav = profile
    ? explorerMode
      ? NAV_ITEMS
      : filterNavItems(NAV_ITEMS, effectiveRole, effectivePermissions)
    : []

  const sidebarContent = (
    <>
      {/* Logo area - matches header height */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight text-foreground">Gama</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ERP System</span>
          </div>
        </Link>
        {/* Close button - mobile only */}
        <button
          onClick={close}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Explorer mode banner */}
      {explorerMode && (
        <div className="mx-3 mt-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <Globe className="h-3.5 w-3.5" />
            Mode Explorer
          </div>
          <p className="text-[10px] text-blue-600 mt-0.5">
            Semua menu ditampilkan. Beberapa halaman mungkin tidak memiliki data untuk role Anda.
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {isLoading ? (
          // Loading skeleton
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </>
        ) : (
          filteredNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const hasActiveChild = item.children?.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
            const showChildren = isActive || hasActiveChild
            return (
              <div key={item.title}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive || hasActiveChild
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
                {/* Render children if present */}
                {item.children && item.children.length > 0 && showChildren && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors',
                          pathname === child.href || pathname.startsWith(child.href + '/')
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <span>{child.title}</span>
                        {/* Show notification dot for What's New */}
                        {child.href === '/changelog' && <ChangelogNotificationDot />}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </nav>

      {/* Footer: explorer toggle + role indicator */}
      {profile && (
        <div className="border-t p-4 space-y-2">
          {/* Explorer mode toggle */}
          <button
            onClick={toggleExplorer}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              explorerMode
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {explorerMode ? (
              <>
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke Menu Saya
              </>
            ) : (
              <>
                <Globe className="h-3.5 w-3.5" />
                Jelajahi Semua Menu
              </>
            )}
          </button>

          {/* Role indicator */}
          <div className="text-xs text-muted-foreground">
            {isPreviewActive ? (
              <>
                Viewing as:{' '}
                <span className="font-medium capitalize text-yellow-600">
                  {effectiveRole}
                </span>
              </>
            ) : (
              <>
                Role:{' '}
                <span className={`font-medium capitalize ${profile.role === 'owner' ? 'text-amber-600' : ''}`}>
                  {profile.role === 'owner' ? '👑 Owner' : profile.role}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full w-64 flex-col border-r bg-card">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={close}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card shadow-xl transition-transform duration-200 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>
    </>
  )
}
