'use client'

import { Badge } from '@/components/ui/badge'
import { AssetStatus } from '@/types/assets'
import { getAssetStatusLabel, getAssetStatusBadgeVariant } from '@/lib/asset-utils'

interface AssetStatusBadgeProps {
  status: AssetStatus
  className?: string
}

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  return (
    <Badge variant={getAssetStatusBadgeVariant(status)} className={className}>
      {getAssetStatusLabel(status)}
    </Badge>
  )
}
