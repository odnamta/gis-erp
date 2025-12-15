'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  href: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

const variantStyles = {
  default: 'text-muted-foreground',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
}

const variantBgStyles = {
  default: '',
  success: 'border-green-200 bg-green-50/50',
  warning: 'border-yellow-200 bg-yellow-50/50',
  danger: 'border-red-200 bg-red-50/50',
}

export function KPICard({
  title,
  value,
  description,
  icon: Icon,
  href,
  variant = 'default',
  isLoading = false,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Link href={href}>
      <Card className={cn(
        'hover:shadow-md transition-shadow cursor-pointer',
        variantBgStyles[variant]
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={cn('h-4 w-4', variantStyles[variant])} />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', variantStyles[variant])}>
            {value}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
