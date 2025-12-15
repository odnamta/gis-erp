'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, FileText, Truck, Receipt } from 'lucide-react'
import Link from 'next/link'

export function QuickActionsPanel() {
  const actions = [
    {
      label: 'New PJO',
      href: '/pjo/new',
      icon: Plus,
      variant: 'default' as const,
    },
    {
      label: 'New Customer',
      href: '/customers/new',
      icon: Users,
      variant: 'outline' as const,
    },
    {
      label: 'All PJOs',
      href: '/pjo',
      icon: FileText,
      variant: 'ghost' as const,
    },
    {
      label: 'All JOs',
      href: '/jo',
      icon: Truck,
      variant: 'ghost' as const,
    },
    {
      label: 'All Invoices',
      href: '/invoices',
      icon: Receipt,
      variant: 'ghost' as const,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.label} variant={action.variant} asChild>
              <Link href={action.href}>
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
