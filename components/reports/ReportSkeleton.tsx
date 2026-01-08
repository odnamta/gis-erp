import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ReportSkeletonProps {
  showFilters?: boolean
  showSummary?: boolean
  rows?: number
  columns?: number
  summaryCards?: number
  variant?: 'default' | 'profitability' | 'simple'
}

export function ReportSkeleton({
  showFilters = true,
  showSummary = true,
  rows = 10,
  columns = 5,
  summaryCards = 4,
  variant = 'default',
}: ReportSkeletonProps) {
  // Profitability variant has 7 summary cards
  const cardCount = variant === 'profitability' ? 7 : summaryCards
  const colCount = variant === 'profitability' ? 9 : columns

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Filters card skeleton */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards skeleton */}
      {showSummary && (
        <div className={`grid grid-cols-2 md:grid-cols-4 ${variant === 'profitability' ? 'lg:grid-cols-7' : ''} gap-4`}>
          {Array.from({ length: cardCount }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table skeleton */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: colCount }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, row) => (
              <TableRow key={row}>
                {Array.from({ length: colCount }).map((_, col) => (
                  <TableCell key={col}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
