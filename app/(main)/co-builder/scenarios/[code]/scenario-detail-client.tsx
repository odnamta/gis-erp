'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  Trophy,
  Loader2,
  Star,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { completeScenario } from '../../actions'
import type { TestScenario } from '../../actions'

export function ScenarioDetailClient({ scenario }: { scenario: TestScenario }) {
  const router = useRouter()
  const { toast } = useToast()
  const [checkpoints, setCheckpoints] = useState<Record<number, 'pass' | 'fail' | 'skip'>>({})
  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState('')
  const [issuesFound, setIssuesFound] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const steps = scenario.steps || []
  const allChecked = steps.every((_, i) => checkpoints[i] !== undefined)

  async function handleSubmit() {
    if (!allChecked || rating === 0) return
    setIsSubmitting(true)

    const result = await completeScenario({
      scenarioId: scenario.id,
      checkpointResults: checkpoints,
      overallRating: rating,
      comments: comments || undefined,
      issuesFound: issuesFound || undefined,
    })

    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: `+${result.points} poin!`,
        description: 'Skenario berhasil diselesaikan',
      })
      router.push('/co-builder/scenarios')
      router.refresh()
    } else {
      toast({
        title: 'Gagal',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  if (scenario.is_completed) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/co-builder/scenarios"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-green-600">Skenario Sudah Selesai</h2>
            <p className="text-muted-foreground mt-2">
              Kamu sudah menyelesaikan skenario {scenario.scenario_code}
            </p>
            <Button className="mt-4" asChild>
              <Link href="/co-builder/scenarios">Lihat Skenario Lain</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/co-builder/scenarios"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono">{scenario.scenario_code}</Badge>
            <Badge variant="secondary">
              <Trophy className="mr-1 h-3 w-3" />
              {scenario.points_value} pts
            </Badge>
            <Badge variant="outline">
              <Clock className="mr-1 h-3 w-3" />
              ~{scenario.estimated_minutes} menit
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{scenario.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Langkah-langkah</h2>
        {steps.map((step, idx) => {
          const status = checkpoints[idx]
          return (
            <Card
              key={idx}
              className={
                status === 'pass' ? 'border-green-200 bg-green-50/50' :
                status === 'fail' ? 'border-red-200 bg-red-50/50' :
                status === 'skip' ? 'border-gray-200 bg-gray-50/50' : ''
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{step.instruction}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Checkpoint: {step.checkpoint}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant={status === 'pass' ? 'default' : 'outline'}
                        className={status === 'pass' ? 'bg-green-600 hover:bg-green-700' : ''}
                        onClick={() => setCheckpoints(prev => ({ ...prev, [idx]: 'pass' }))}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Pass
                      </Button>
                      <Button
                        size="sm"
                        variant={status === 'fail' ? 'default' : 'outline'}
                        className={status === 'fail' ? 'bg-red-600 hover:bg-red-700' : ''}
                        onClick={() => setCheckpoints(prev => ({ ...prev, [idx]: 'fail' }))}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Fail
                      </Button>
                      <Button
                        size="sm"
                        variant={status === 'skip' ? 'default' : 'outline'}
                        className={status === 'skip' ? 'bg-gray-600 hover:bg-gray-700' : ''}
                        onClick={() => setCheckpoints(prev => ({ ...prev, [idx]: 'skip' }))}
                      >
                        <SkipForward className="mr-1 h-3 w-3" />
                        Skip
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Rating & Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Penilaian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating Keseluruhan *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Issues Found */}
          <div className="space-y-2">
            <Label htmlFor="issues">Masalah yang Ditemukan</Label>
            <Textarea
              id="issues"
              placeholder="Jelaskan masalah yang kamu temukan selama mengikuti skenario..."
              value={issuesFound}
              onChange={(e) => setIssuesFound(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Komentar Tambahan</Label>
            <Textarea
              id="comments"
              placeholder="Komentar atau saran tambahan..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!allChecked || rating === 0 || isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600"
            size="lg"
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</>
            ) : (
              <>Selesaikan Skenario (+{scenario.points_value} pts)</>
            )}
          </Button>
          {(!allChecked || rating === 0) && (
            <p className="text-xs text-muted-foreground text-center">
              {!allChecked ? 'Tandai semua checkpoint terlebih dahulu' : 'Berikan rating terlebih dahulu'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
