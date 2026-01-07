'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, ArrowRight, Loader2, AlertTriangle } from 'lucide-react'
import { ConversionReadiness } from '@/types'
import { checkConversionReadiness, convertToJobOrder } from '@/app/(main)/proforma-jo/conversion-actions'
import { useToast } from '@/hooks/use-toast'
import { formatIDR } from '@/lib/pjo-utils'

interface ConversionStatusProps {
  pjoId: string
  pjoStatus: string
  isConverted: boolean
  jobOrderId?: string | null
}

export function ConversionStatus({ pjoId, pjoStatus, isConverted, jobOrderId }: ConversionStatusProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [readiness, setReadiness] = useState<ConversionReadiness | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

  useEffect(() => {
    async function fetchReadiness() {
      setIsLoading(true)
      try {
        const result = await checkConversionReadiness(pjoId)
        setReadiness(result)
      } finally {
        setIsLoading(false)
      }
    }
    if (pjoStatus === 'approved' && !isConverted) {
      fetchReadiness()
    }
  }, [pjoId, pjoStatus, isConverted])

  async function handleConvert() {
    setIsConverting(true)
    try {
      const result = await convertToJobOrder(pjoId)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: `Job Order ${result.jobOrder?.jo_number} created` })
        router.push(`/job-orders/${result.jobOrder?.id}`)
      }
    } finally {
      setIsConverting(false)
    }
  }

  // Already converted
  if (isConverted) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            Converted to Job Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600 dark:text-green-400 mb-4">
            This PJO has been converted to a Job Order.
          </p>
          {jobOrderId && (
            <Button variant="outline" onClick={() => router.push(`/job-orders/${jobOrderId}`)}>
              View Job Order
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Not approved yet
  if (pjoStatus !== 'approved') {
    return null
  }

  // Loading
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking conversion readiness...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!readiness) return null

  return (
    <Card className={readiness.ready ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {readiness.ready ? (
            <>
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Ready for Conversion
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-muted-foreground" />
              Not Ready for Conversion
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blockers */}
        {!readiness.ready && readiness.blockers && readiness.blockers.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {readiness.blockers.map((blocker, i) => (
                  <li key={i}>{blocker}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary */}
        {readiness.ready && readiness.summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Final Revenue</p>
                <p className="font-semibold">{formatIDR(readiness.summary.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Final Cost</p>
                <p className="font-semibold">{formatIDR(readiness.summary.totalCost)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Final Profit</p>
                <p className={`font-semibold ${readiness.summary.estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatIDR(readiness.summary.estimatedProfit)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Final Margin</p>
                <p className={`font-semibold ${readiness.summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {readiness.summary.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>

            <Button onClick={handleConvert} disabled={isConverting} className="w-full">
              {isConverting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  Convert to Job Order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
