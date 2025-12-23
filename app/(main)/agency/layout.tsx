'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Ship } from 'lucide-react'

// Map of paths to breadcrumb labels
const BREADCRUMB_LABELS: Record<string, string> = {
  '/agency': 'Agency',
  '/agency/shipping-lines': 'Shipping Lines',
  '/agency/shipping-lines/new': 'New Shipping Line',
  '/agency/port-agents': 'Port Agents',
  '/agency/port-agents/new': 'New Port Agent',
  '/agency/service-providers': 'Service Providers',
  '/agency/service-providers/new': 'New Service Provider',
  '/agency/shipping-rates': 'Shipping Rates',
  '/agency/shipping-rates/new': 'New Rate',
  '/agency/shipping-rates/manage': 'Manage Rates',
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: { label: string; href: string }[] = []
  
  let currentPath = ''
  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`
    const segment = segments[i]
    
    // Skip dynamic segments like [id] - they'll be handled specially
    if (segment.startsWith('[') || /^[0-9a-f-]{36}$/i.test(segment)) {
      // This is a UUID or dynamic segment
      if (i === segments.length - 1) {
        // Last segment is an ID - show "Details"
        breadcrumbs.push({ label: 'Details', href: currentPath })
      } else if (segments[i + 1] === 'edit') {
        // Next segment is edit - skip the ID, we'll show "Edit" next
        continue
      } else {
        breadcrumbs.push({ label: 'Details', href: currentPath })
      }
    } else if (segment === 'edit') {
      breadcrumbs.push({ label: 'Edit', href: currentPath })
    } else {
      const label = BREADCRUMB_LABELS[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      breadcrumbs.push({ label, href: currentPath })
    }
  }
  
  return breadcrumbs
}

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-2" />
            {index === breadcrumbs.length - 1 ? (
              <span className="text-foreground font-medium flex items-center gap-1.5">
                {index === 0 && <Ship className="h-4 w-4" />}
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <Suspense fallback={<div className="flex items-center justify-center py-8">Loading...</div>}>
        {children}
      </Suspense>
    </div>
  )
}
