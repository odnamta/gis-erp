'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatBKKCurrency } from '@/lib/bkk-utils'
import { getBKKById, releaseBKK } from '@/app/(main)/job-orders/bkk-actions'
import type { BKKWithRelations, ReleaseBKKInput, BKKReleaseMethod } from '@/types/database'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ReleaseBKKPage() {
  const router = useRouter()
  const params = useParams()
  const jobOrderId = params.id as string
  const bkkId = params.bkkId as string

  const [bkk, setBkk] = useState<BKKWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [releaseMethod, setReleaseMethod] = useState<BKKReleaseMethod>('cash')
  const [releaseReference, setReleaseReference] = useState('')

  useEffect(() => {
    async function loadBKK() {
      const data = await getBKKById(bkkId)
      if (!data || data.status !== 'approved') {
        router.push(`/job-orders/${jobOrderId}`)
        return
      }
      setBkk(data)
      setIsLoading(false)
    }
    loadBKK()
  }, [bkkId, jobOrderId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!releaseMethod) {
      toast.error('Release method is required')
      return
    }

    setIsSubmitting(true)

    const input: ReleaseBKKInput = {
      release_method: releaseMethod,
      release_reference: releaseReference.trim() || undefined,
    }

    const result = await releaseBKK(bkkId, input)
    setIsSubmitting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cash released successfully')
      router.push(`/job-orders/${jobOrderId}`)
      router.refresh()
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!bkk) {
    return null
  }

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/job-orders/${jobOrderId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Release Cash</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Release {bkk.bkk_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* BKK Info */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Purpose</p>
                <p>{bkk.purpose}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount to Release</p>
                <p className="text-2xl font-bold">{formatBKKCurrency(bkk.amount_requested)}</p>
              </div>
            </div>

            {/* Release Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="release-method">Release Method *</Label>
                <Select value={releaseMethod} onValueChange={(v) => setReleaseMethod(v as BKKReleaseMethod)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="release-reference">Reference Number (Optional)</Label>
                <Input
                  id="release-reference"
                  value={releaseReference}
                  onChange={(e) => setReleaseReference(e.target.value)}
                  placeholder="e.g., Transfer reference, receipt number..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Release Cash
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
