'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  EngineeringStatus,
  RiskLevel,
  AssessmentStatus,
  ENGINEERING_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  ASSESSMENT_STATUS_LABELS,
} from '@/types/engineering'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from 'lucide-react'

interface EngineeringStatusBadgeProps {
  status: EngineeringStatus | null | undefined
  className?: string
  showIcon?: boolean
}

const statusConfig: Record<EngineeringStatus, { color: string; icon: React.ReactNode }> = {
  not_required: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  pending: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock className="h-3 w-3" />,
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  waived: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Shield className="h-3 w-3" />,
  },
}

export function EngineeringStatusBadge({
  status,
  className,
  showIcon = true,
}: EngineeringStatusBadgeProps) {
  if (!status) return null

  const config = statusConfig[status]
  const label = ENGINEERING_STATUS_LABELS[status]

  return (
    <Badge variant="outline" className={cn(config.color, 'gap-1', className)}>
      {showIcon && config.icon}
      {label}
    </Badge>
  )
}

interface RiskLevelBadgeProps {
  level: RiskLevel | null | undefined
  className?: string
  showIcon?: boolean
}

const riskConfig: Record<RiskLevel, { color: string; icon: React.ReactNode }> = {
  low: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Shield className="h-3 w-3" />,
  },
  high: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  critical: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <ShieldX className="h-3 w-3" />,
  },
}

export function RiskLevelBadge({
  level,
  className,
  showIcon = true,
}: RiskLevelBadgeProps) {
  if (!level) return null

  const config = riskConfig[level]
  const label = RISK_LEVEL_LABELS[level]

  return (
    <Badge variant="outline" className={cn(config.color, 'gap-1', className)}>
      {showIcon && config.icon}
      {label}
    </Badge>
  )
}

interface AssessmentStatusBadgeProps {
  status: AssessmentStatus | null | undefined
  className?: string
  showIcon?: boolean
}

const assessmentStatusConfig: Record<AssessmentStatus, { color: string; icon: React.ReactNode }> = {
  pending: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <Clock className="h-3 w-3" />,
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  cancelled: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="h-3 w-3" />,
  },
}

export function AssessmentStatusBadge({
  status,
  className,
  showIcon = true,
}: AssessmentStatusBadgeProps) {
  if (!status) return null

  const config = assessmentStatusConfig[status]
  const label = ASSESSMENT_STATUS_LABELS[status]

  return (
    <Badge variant="outline" className={cn(config.color, 'gap-1', className)}>
      {showIcon && config.icon}
      {label}
    </Badge>
  )
}
