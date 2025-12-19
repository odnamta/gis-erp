'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MarketTypeBadge } from '@/components/ui/market-type-badge'
import { MarketClassification, COMPLEXITY_THRESHOLDS } from '@/types/market-classification'
import { Calculator, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface MarketClassificationDisplayProps {
  classification: MarketClassification | null
  isCalculating: boolean
  onRecalculate?: () => void
  disabled?: boolean
}

export function MarketClassificationDisplay({
  classification,
  isCalculating,
  onRecalculate,
  disabled = false,
}: MarketClassificationDisplayProps) {
  const score = classification?.complexity_score ?? 0
  const maxScore = 100
  const progressValue = Math.min((score / maxScore) * 100, 100)
  const isComplex = classification?.market_type === 'complex'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Market Classification
        </CardTitle>
        {onRecalculate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRecalculate}
            disabled={disabled || isCalculating}
          >
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Recalculate
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Classification Badge and Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MarketTypeBadge
              marketType={classification?.market_type}
              score={score}
              showScore
            />
            {classification && (
              <span className="text-sm text-muted-foreground">
                Threshold: {COMPLEXITY_THRESHOLDS.COMPLEX_MIN}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Complexity Score</span>
            <span className="font-medium">{score} / {maxScore}</span>
          </div>
          <Progress
            value={progressValue}
            className={isComplex ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Simple (0-{COMPLEXITY_THRESHOLDS.SIMPLE_MAX})</span>
            <span>Complex ({COMPLEXITY_THRESHOLDS.COMPLEX_MIN}+)</span>
          </div>
        </div>

        {/* Triggered Factors */}
        {classification && classification.complexity_factors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Triggered Factors</h4>
            <div className="space-y-1">
              {classification.complexity_factors.map((factor, index) => (
                <div
                  key={`${factor.criteria_code}-${index}`}
                  className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2"
                >
                  <span>{factor.criteria_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {factor.triggered_value}
                    </span>
                    <span className="font-medium text-orange-600">
                      +{factor.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Factors Message */}
        {classification && classification.complexity_factors.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            No complexity factors triggered
          </div>
        )}

        {/* Engineering Warning */}
        {isComplex && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Engineering Review Required</AlertTitle>
            <AlertDescription className="text-orange-700">
              This project is classified as Complex and requires Engineering assessment
              before approval. Please coordinate with the Engineering team.
            </AlertDescription>
          </Alert>
        )}

        {/* Not Calculated Message */}
        {!classification && !isCalculating && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Enter cargo specifications and route characteristics to calculate classification
          </div>
        )}
      </CardContent>
    </Card>
  )
}