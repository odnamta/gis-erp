'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Bug,
  Frown,
  Lightbulb,
  ThumbsUp,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react'
import type { CompetitionFeedback } from '../actions'

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-red-500' },
  ux_issue: { label: 'UX Issue', icon: Frown, color: 'text-orange-500' },
  suggestion: { label: 'Saran', icon: Lightbulb, color: 'text-blue-500' },
  praise: { label: 'Pujian', icon: ThumbsUp, color: 'text-green-500' },
  question: { label: 'Pertanyaan', icon: HelpCircle, color: 'text-purple-500' },
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending_review: { label: 'Menunggu Review', variant: 'secondary', icon: Clock },
  acknowledged: { label: 'Diterima', variant: 'default', icon: CheckCircle2 },
  in_progress: { label: 'Diproses', variant: 'default', icon: AlertTriangle },
  fixed: { label: 'Diperbaiki', variant: 'default', icon: CheckCircle2 },
  implemented: { label: 'Diimplementasi', variant: 'default', icon: CheckCircle2 },
  wont_fix: { label: 'Tidak Diperbaiki', variant: 'destructive', icon: XCircle },
  duplicate: { label: 'Duplikat', variant: 'outline', icon: XCircle },
}

export function MyFeedbackClient({ feedback }: { feedback: CompetitionFeedback[] }) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? feedback : feedback.filter(f => f.category === filter)

  const totalPoints = feedback.reduce((sum, f) => sum + f.total_points, 0)
  const reviewedCount = feedback.filter(f => f.admin_status !== 'pending_review').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/co-builder"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Feedback Saya</h1>
          <p className="text-sm text-muted-foreground">
            {feedback.length} feedback | {totalPoints} total poin | {reviewedCount} sudah direview
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Semua ({feedback.length})
        </Button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const count = feedback.filter(f => f.category === key).length
          if (count === 0) return null
          const Icon = config.icon
          return (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(key)}
            >
              <Icon className={`mr-1 h-3 w-3 ${config.color}`} />
              {config.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* Feedback List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p>Belum ada feedback. Mulai kirim feedback untuk mendapatkan poin!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb) => {
            const cat = CATEGORY_CONFIG[fb.category] || CATEGORY_CONFIG.question
            const status = STATUS_CONFIG[fb.admin_status] || STATUS_CONFIG.pending_review
            const CatIcon = cat.icon
            const StatusIcon = status.icon
            const createdDate = new Date(fb.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric',
            })

            return (
              <Card key={fb.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CatIcon className={`h-4 w-4 shrink-0 ${cat.color}`} />
                        <h3 className="font-medium truncate">{fb.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {fb.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant={status.variant} className="text-xs">
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {fb.effort_level}
                        </Badge>
                        {fb.impact_level !== 'pending' && (
                          <Badge variant="outline" className="text-xs">
                            Impact: {fb.impact_level} (x{fb.impact_multiplier})
                          </Badge>
                        )}
                        <span className="text-muted-foreground">{createdDate}</span>
                        {fb.page_url && (
                          <span className="text-muted-foreground truncate max-w-[200px]">
                            {fb.page_url}
                          </span>
                        )}
                      </div>

                      {/* Admin Response */}
                      {fb.admin_response && (
                        <div className="mt-3 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
                          <p className="font-medium text-blue-800 mb-1">Respon Admin:</p>
                          <p className="text-blue-700">{fb.admin_response}</p>
                        </div>
                      )}
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-orange-600">+{fb.total_points}</div>
                      <div className="text-xs text-muted-foreground">poin</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
