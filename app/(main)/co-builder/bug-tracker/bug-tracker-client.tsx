'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Bug,
  Frown,
  Lightbulb,
  ThumbsUp,
  HelpCircle,
  MessageSquare,
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'Menunggu', color: 'bg-gray-100 text-gray-700' },
  acknowledged: { label: 'Diterima', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Diproses', color: 'bg-yellow-100 text-yellow-700' },
  fixed: { label: 'Diperbaiki', color: 'bg-green-100 text-green-700' },
  implemented: { label: 'Diimplementasi', color: 'bg-green-100 text-green-700' },
  wont_fix: { label: 'Tidak Diperbaiki', color: 'bg-red-100 text-red-700' },
  duplicate: { label: 'Duplikat', color: 'bg-gray-100 text-gray-700' },
}

const IMPACT_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600' },
  helpful: { label: 'Helpful', color: 'bg-blue-100 text-blue-700' },
  important: { label: 'Important', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
}

export function BugTrackerClient({ feedback, currentUserId }: { feedback: CompetitionFeedback[]; currentUserId: string }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [impactFilter, setImpactFilter] = useState('all')
  const [selectedFeedback, setSelectedFeedback] = useState<CompetitionFeedback | null>(null)

  let filtered = feedback
  if (statusFilter !== 'all') filtered = filtered.filter(f => f.admin_status === statusFilter)
  if (categoryFilter !== 'all') filtered = filtered.filter(f => f.category === categoryFilter)
  if (impactFilter !== 'all') filtered = filtered.filter(f => f.impact_level === impactFilter)

  const stats = {
    total: feedback.length,
    bugs: feedback.filter(f => f.category === 'bug').length,
    fixed: feedback.filter(f => f.admin_status === 'fixed' || f.admin_status === 'implemented').length,
    pending: feedback.filter(f => f.admin_status === 'pending_review').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/co-builder"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bug Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Semua feedback dari tim Co-Builder — klik baris untuk diskusi
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.bugs}</div>
            <div className="text-xs text-muted-foreground">Bugs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.fixed}</div>
            <div className="text-xs text-muted-foreground">Diperbaiki</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={impactFilter} onValueChange={setImpactFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Impact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Impact</SelectItem>
            {Object.entries(IMPACT_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center text-sm text-muted-foreground">
          {filtered.length} hasil
        </span>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Kategori</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead className="w-[120px]">Pengirim</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Impact</TableHead>
                <TableHead className="w-[80px] text-right">Poin</TableHead>
                <TableHead className="w-[100px]">Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Tidak ada feedback ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((fb) => {
                  const cat = CATEGORY_CONFIG[fb.category] || CATEGORY_CONFIG.question
                  const status = STATUS_CONFIG[fb.admin_status] || STATUS_CONFIG.pending_review
                  const impact = IMPACT_CONFIG[fb.impact_level] || IMPACT_CONFIG.pending
                  const CatIcon = cat.icon

                  return (
                    <TableRow
                      key={fb.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedFeedback(fb)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <CatIcon className={`h-4 w-4 ${cat.color}`} />
                          <span className="text-xs">{cat.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <p className="font-medium truncate">{fb.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{fb.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{fb.user_name || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${impact.color}`}>
                          {impact.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fb.total_points}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(fb.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short',
                        })}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Sheet with Support Thread */}
      <Sheet open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <SheetContent className="w-full sm:max-w-[540px] flex flex-col">
          {selectedFeedback && (() => {
            const cat = CATEGORY_CONFIG[selectedFeedback.category] || CATEGORY_CONFIG.question
            const status = STATUS_CONFIG[selectedFeedback.admin_status] || STATUS_CONFIG.pending_review
            const impact = IMPACT_CONFIG[selectedFeedback.impact_level] || IMPACT_CONFIG.pending
            const CatIcon = cat.icon

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <CatIcon className={`h-5 w-5 shrink-0 ${cat.color}`} />
                    <span className="truncate">{selectedFeedback.title}</span>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto space-y-4 mt-4">
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${impact.color}`}>
                      {impact.label}
                    </span>
                    <Badge variant="outline" className="text-xs">{selectedFeedback.effort_level}</Badge>
                    <Badge variant="outline" className="text-xs">+{selectedFeedback.total_points} poin</Badge>
                  </div>

                  {/* Submitter & date */}
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{selectedFeedback.user_name || 'Unknown'}</span>
                    {selectedFeedback.user_role && (
                      <span> ({selectedFeedback.user_role})</span>
                    )}
                    <span> &middot; {new Date(selectedFeedback.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}</span>
                  </div>

                  {/* Description */}
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedFeedback.description}</p>
                  </div>

                  {/* Steps to reproduce */}
                  {selectedFeedback.steps_to_reproduce && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Langkah Reproduksi</h4>
                      <p className="text-sm whitespace-pre-wrap">{selectedFeedback.steps_to_reproduce}</p>
                    </div>
                  )}

                  {/* Suggestion */}
                  {selectedFeedback.suggestion && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Saran</h4>
                      <p className="text-sm whitespace-pre-wrap">{selectedFeedback.suggestion}</p>
                    </div>
                  )}

                  {/* Page URL */}
                  {selectedFeedback.page_url && (
                    <div className="text-xs text-muted-foreground">
                      Halaman: <span className="font-mono">{selectedFeedback.page_url}</span>
                    </div>
                  )}

                  {/* Screenshot */}
                  {selectedFeedback.screenshot_url && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Screenshot</h4>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedFeedback.screenshot_url}
                        alt="Screenshot"
                        className="rounded border max-h-[200px] object-contain"
                      />
                    </div>
                  )}

                  {/* Support Thread */}
                  <div className="pt-2 border-t">
                    <SupportThread
                      entityType="competition_feedback"
                      entityId={selectedFeedback.id}
                      currentUserId={currentUserId}
                      isAdmin={true}
                      title="Diskusi dengan Pengguna"
                    />
                  </div>
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
