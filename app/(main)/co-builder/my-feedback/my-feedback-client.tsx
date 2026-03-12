'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
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
  AlertTriangle,
  MessageSquare,
  Shield,
  Star,
  Copy,
  Sparkles,
} from 'lucide-react'
import { SupportThread } from '@/components/support/support-thread'
import type { CompetitionFeedback } from '../actions'

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-red-500' },
  ux_issue: { label: 'UX Issue', icon: Frown, color: 'text-orange-500' },
  suggestion: { label: 'Saran', icon: Lightbulb, color: 'text-blue-500' },
  praise: { label: 'Pujian', icon: ThumbsUp, color: 'text-green-500' },
  question: { label: 'Pertanyaan', icon: HelpCircle, color: 'text-purple-500' },
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  new: { label: 'Menunggu Review', variant: 'secondary', icon: Clock },
  pending_review: { label: 'Menunggu Review', variant: 'secondary', icon: Clock },
  acknowledged: { label: 'Ditinjau', variant: 'default', icon: CheckCircle2 },
  in_progress: { label: 'Diproses', variant: 'default', icon: AlertTriangle },
  fixed: { label: 'Diperbaiki', variant: 'default', icon: CheckCircle2 },
  implemented: { label: 'Diimplementasi', variant: 'default', icon: Sparkles },
  wont_fix: { label: 'Ditunda', variant: 'secondary', icon: Clock },
  duplicate: { label: 'Duplikat', variant: 'outline', icon: Copy },
}

type FilterMode = 'all' | 'category' | 'status'

export function MyFeedbackClient({ feedback, currentUserId, actualTotalPoints, unreadCounts = {} }: { feedback: CompetitionFeedback[]; currentUserId: string; actualTotalPoints?: number; unreadCounts?: Record<string, number> }) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [filterValue, setFilterValue] = useState<string>('all')

  const filtered = filterValue === 'all'
    ? feedback
    : filterMode === 'category'
      ? feedback.filter(f => f.category === filterValue)
      : feedback.filter(f => f.admin_status === filterValue)

  const totalPoints = actualTotalPoints ?? feedback.reduce((sum, f) => sum + f.total_points, 0)

  // Status counts
  const fixedCount = feedback.filter(f => f.admin_status === 'fixed' || f.admin_status === 'implemented').length
  const duplicateCount = feedback.filter(f => f.admin_status === 'duplicate').length
  const deferredCount = feedback.filter(f => f.admin_status === 'wont_fix').length
  const pendingCount = feedback.filter(f => f.admin_status === 'new' || f.admin_status === 'pending_review').length
  const acknowledgedCount = feedback.filter(f => f.admin_status === 'acknowledged').length

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
            {feedback.length} feedback | {totalPoints} total poin
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setFilterMode('status'); setFilterValue(fixedCount > 0 ? 'fixed' : 'all') }}>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-xl font-bold text-green-600">{fixedCount}</div>
            <div className="text-xs text-muted-foreground">Diperbaiki</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setFilterMode('status'); setFilterValue('acknowledged') }}>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-xl font-bold text-blue-600">{acknowledgedCount}</div>
            <div className="text-xs text-muted-foreground">Ditinjau</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setFilterMode('status'); setFilterValue('wont_fix') }}>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <div className="text-xl font-bold text-amber-600">{deferredCount}</div>
            <div className="text-xs text-muted-foreground">Ditunda</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setFilterMode('status'); setFilterValue('duplicate') }}>
          <CardContent className="p-3 text-center">
            <Copy className="h-5 w-5 mx-auto mb-1 text-gray-400" />
            <div className="text-xl font-bold text-gray-500">{duplicateCount}</div>
            <div className="text-xs text-muted-foreground">Duplikat</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setFilterMode('status'); setFilterValue('new') }}>
          <CardContent className="p-3 text-center">
            <Star className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <div className="text-xl font-bold text-orange-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Menunggu</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterValue === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setFilterMode('all'); setFilterValue('all') }}
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
              variant={filterMode === 'category' && filterValue === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setFilterMode('category'); setFilterValue(key) }}
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

            const isDimmed = fb.admin_status === 'duplicate' || fb.admin_status === 'wont_fix'

            return (
              <Card key={fb.id} className={`hover:shadow-sm transition-shadow ${isDimmed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CatIcon className={`h-4 w-4 shrink-0 ${cat.color}`} />
                        <h3 className={`font-medium truncate ${fb.admin_status === 'duplicate' ? 'line-through' : ''}`}>{fb.title}</h3>
                        {unreadCounts[fb.id] > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                            {unreadCounts[fb.id]} baru
                          </Badge>
                        )}
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
                        {fb.is_ai_suggestion && (
                          <Badge variant="secondary" className="text-xs">
                            0.5x — ditunda ke fase AI
                          </Badge>
                        )}
                        <span className="text-muted-foreground">{createdDate}</span>
                      </div>

                      {/* Admin Response */}
                      {fb.admin_response && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Shield className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Balasan Admin</span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{fb.admin_response}</p>
                        </div>
                      )}

                      {/* Support Thread */}
                      <div className="mt-3">
                        <SupportThread
                          entityType="competition_feedback"
                          entityId={fb.id}
                          currentUserId={currentUserId}
                        />
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0">
                      {fb.admin_status === 'duplicate' ? (
                        <>
                          <div className="text-lg font-bold text-gray-400 line-through">+{fb.base_points}</div>
                          <div className="text-xs text-muted-foreground">0 poin</div>
                        </>
                      ) : (
                        <>
                          <div className={`text-lg font-bold ${fb.is_ai_suggestion ? 'text-amber-500' : 'text-orange-600'}`}>+{fb.total_points}</div>
                          <div className="text-xs text-muted-foreground">poin</div>
                        </>
                      )}
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
