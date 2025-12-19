import { Badge } from '@/components/ui/badge'
import { MarketType } from '@/types/market-classification'
import { cn } from '@/lib/utils'

interface MarketTypeBadgeProps {
  marketType: MarketType | null | undefined
  score?: number
  showScore?: boolean
  className?: string
}

export function MarketTypeBadge({
  marketType,
  score,
  showScore = false,
  className,
}: MarketTypeBadgeProps) {
  if (!marketType) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        Not Classified
      </Badge>
    )
  }

  const isComplex = marketType === 'complex'

  return (
    <Badge
      variant={isComplex ? 'destructive' : 'default'}
      className={cn(
        isComplex
          ? 'bg-orange-500 hover:bg-orange-600 text-white'
          : 'bg-green-500 hover:bg-green-600 text-white',
        className
      )}
    >
      {isComplex ? 'Complex' : 'Simple'}
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-80">({score})</span>
      )}
    </Badge>
  )
}