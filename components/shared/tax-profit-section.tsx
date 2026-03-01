'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils/format'
import { getCompanySetting } from '@/app/(main)/settings/company/actions'

interface TaxProfitSectionProps {
  totalRevenue: number
  totalCosts: number
  grossProfit: number
  grossMargin: number
}

const DEFAULT_VAT_RATE = 11
const DEFAULT_PPH_RATE = 2

export function TaxProfitSection({
  totalRevenue,
  totalCosts,
  grossProfit,
  grossMargin,
}: TaxProfitSectionProps) {
  const [vatRate, setVatRate] = useState(DEFAULT_VAT_RATE)
  const [pphRate] = useState(DEFAULT_PPH_RATE)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSettings() {
      try {
        const vatRateStr = await getCompanySetting('vat_rate')
        if (vatRateStr) {
          const parsed = parseFloat(vatRateStr)
          if (!isNaN(parsed) && parsed >= 0) {
            setVatRate(parsed)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const ppnAmount = totalRevenue * (vatRate / 100)
  const pphAmount = totalRevenue * (pphRate / 100)
  const netRevenue = totalRevenue - ppnAmount - pphAmount
  const netProfit = netRevenue - totalCosts
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  if (isLoading) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pajak & Laba Bersih</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gross Summary */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-muted-foreground">Pendapatan Kotor</Label>
            <p className="text-lg font-semibold">{formatCurrency(totalRevenue)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Total Biaya</Label>
            <p className="text-lg font-semibold">{formatCurrency(totalCosts)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Laba Kotor</Label>
            <p className={`text-lg font-semibold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(grossProfit)}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Margin Kotor</Label>
            <p className={`text-lg font-semibold ${grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {grossMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Tax Deductions */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Potongan Pajak</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">
                PPN (Pajak Pertambahan Nilai) — {vatRate}%
              </Label>
              <p className="text-lg font-semibold text-amber-600">
                -{formatCurrency(ppnAmount)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">
                PPh (Pajak Penghasilan) — {pphRate}%
              </Label>
              <p className="text-lg font-semibold text-amber-600">
                -{formatCurrency(pphAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Net Results */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="text-muted-foreground">Pendapatan Bersih (setelah pajak)</Label>
            <p className="text-lg font-semibold">{formatCurrency(netRevenue)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Laba Bersih</Label>
            <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Margin Bersih</Label>
            <p className={`text-lg font-semibold ${netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
