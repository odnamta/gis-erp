'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/utils/format'
import { COST_CATEGORY_LABELS } from '@/lib/pjo-utils'
import {
  generateBKKSuggestionsFromJO,
  type BKKSuggestion,
  type BKKAutoGenerationResult,
} from '@/lib/bkk-auto-generation'
import { createBKK } from '@/app/(main)/job-orders/bkk-actions'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Building2,
  Banknote,
} from 'lucide-react'

interface BKKAutoGenerateProps {
  jobOrderId: string
  joNumber: string
}

export function BKKAutoGenerate({ jobOrderId, joNumber }: BKKAutoGenerateProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<BKKAutoGenerationResult | null>(null)
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set())
  const [createdCount, setCreatedCount] = useState(0)

  async function handleGenerate() {
    setLoading(true)
    setResult(null)
    setSelectedIndexes(new Set())
    setCreatedCount(0)
    try {
      const data = await generateBKKSuggestionsFromJO(jobOrderId)
      setResult(data)
      // Select all by default
      if (data.suggestions.length > 0) {
        setSelectedIndexes(new Set(data.suggestions.map((_, i) => i)))
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal mengambil data cost items',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function toggleSelection(index: number) {
    setSelectedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  function toggleAll() {
    if (!result) return
    if (selectedIndexes.size === result.suggestions.length) {
      setSelectedIndexes(new Set())
    } else {
      setSelectedIndexes(new Set(result.suggestions.map((_, i) => i)))
    }
  }

  async function handleCreateBKKs() {
    if (!result || selectedIndexes.size === 0) return

    setCreating(true)
    let successCount = 0
    let errorCount = 0

    for (const index of selectedIndexes) {
      const suggestion = result.suggestions[index]
      // Create one BKK per cost item in this suggestion group
      // If there's only one cost item, link it directly
      // If multiple, create a single BKK for the group without linking a specific cost item
      const bkkInput = {
        jo_id: jobOrderId,
        purpose: suggestion.purpose,
        amount_requested: suggestion.amount,
        budget_category: suggestion.category,
        budget_amount: suggestion.amount,
        vendor_id: suggestion.vendor_id || undefined,
        pjo_cost_item_id:
          suggestion.cost_item_ids.length === 1
            ? suggestion.cost_item_ids[0]
            : undefined,
        notes:
          suggestion.cost_item_ids.length > 1
            ? `Auto-generated dari ${suggestion.cost_item_ids.length} cost items: ${suggestion.cost_item_descriptions.join(', ')}`
            : undefined,
      }

      const res = await createBKK(bkkInput)
      if (res.error) {
        errorCount++
      } else {
        successCount++
      }
    }

    setCreatedCount(successCount)
    setCreating(false)

    if (successCount > 0) {
      toast({
        title: 'Berhasil',
        description: `${successCount} BKK berhasil dibuat${errorCount > 0 ? `, ${errorCount} gagal` : ''}`,
      })
      router.refresh()
    }

    if (errorCount > 0 && successCount === 0) {
      toast({
        title: 'Gagal',
        description: 'Semua BKK gagal dibuat',
        variant: 'destructive',
      })
    }
  }

  const selectedTotal = result
    ? Array.from(selectedIndexes).reduce(
        (sum, i) => sum + (result.suggestions[i]?.amount || 0),
        0
      )
    : 0

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o && !result) {
          handleGenerate()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate BKK dari Cost Items
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Generate BKK dari Cost Items
          </DialogTitle>
          <DialogDescription>
            Buat BKK otomatis berdasarkan cost items PJO untuk {joNumber}.
            Dikelompokkan per vendor dan kategori.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Menganalisis cost items...</span>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Total Estimasi Biaya</p>
                <p className="font-semibold">{formatCurrency(result.total_estimated)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">BKK Existing</p>
                <p className="font-semibold">
                  {result.existing_bkk_count} BKK ({formatCurrency(result.existing_bkk_total)})
                </p>
              </div>
            </div>

            {result.error && result.suggestions.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}

            {createdCount > 0 && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {createdCount} BKK berhasil dibuat. Tutup dialog untuk melihat hasilnya.
                </AlertDescription>
              </Alert>
            )}

            {result.suggestions.length > 0 && createdCount === 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {result.suggestions.length} saran BKK ditemukan
                  </p>
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {selectedIndexes.size === result.suggestions.length
                      ? 'Hapus Semua'
                      : 'Pilih Semua'}
                  </Button>
                </div>

                <div className="space-y-3">
                  {result.suggestions.map((suggestion, index) => (
                    <SuggestionCard
                      key={index}
                      suggestion={suggestion}
                      selected={selectedIndexes.has(index)}
                      onToggle={() => toggleSelection(index)}
                    />
                  ))}
                </div>

                {selectedIndexes.size > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">
                        {selectedIndexes.size} BKK akan dibuat
                      </span>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                        {formatCurrency(selectedTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {createdCount > 0 ? 'Tutup' : 'Batal'}
          </Button>
          {result &&
            result.suggestions.length > 0 &&
            createdCount === 0 && (
              <Button
                onClick={handleCreateBKKs}
                disabled={creating || selectedIndexes.size === 0}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat {selectedIndexes.size} BKK
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SuggestionCard({
  suggestion,
  selected,
  onToggle,
}: {
  suggestion: BKKSuggestion
  selected: boolean
  onToggle: () => void
}) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${
        selected
          ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
          : 'hover:bg-muted/30'
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} className="mt-1" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="shrink-0">
                  {COST_CATEGORY_LABELS[suggestion.category] || suggestion.category}
                </Badge>
                {suggestion.vendor_name && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                    <Building2 className="h-3 w-3 shrink-0" />
                    {suggestion.vendor_name}
                    {suggestion.vendor_code && (
                      <span className="text-xs">({suggestion.vendor_code})</span>
                    )}
                  </span>
                )}
              </div>
              <span className="font-semibold text-sm whitespace-nowrap">
                {formatCurrency(suggestion.amount)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {suggestion.cost_item_descriptions.join(', ')}
            </p>
            <p className="text-xs text-muted-foreground">
              {suggestion.cost_item_ids.length} cost item(s)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
