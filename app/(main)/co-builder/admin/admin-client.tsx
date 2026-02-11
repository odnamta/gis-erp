'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  ArrowLeft,
  Bug,
  Frown,
  Lightbulb,
  ThumbsUp,
  HelpCircle,
  Eye,
  Users,
  MessageSquare,
  Trophy,
  Clock,
} from 'lucide-react'
import type { CompetitionFeedback, LeaderboardEntry } from '../actions'

const CATEGORY_ICONS: Record<string, { icon: typeof Bug; color: string; label: string }> = {
  bug: { icon: Bug, color: 'text-red-500', label: 'Bug' },
  ux_issue: { icon: Frown, color: 'text-orange-500', label: 'UX' },
  suggestion: { icon: Lightbulb, color: 'text-blue-500', label: 'Saran' },
  praise: { icon: ThumbsUp, color: 'text-green-500', label: 'Pujian' },
  question: { icon: HelpCircle, color: 'text-purple-500', label: 'Tanya' },
}

export function AdminClient({
  feedback,
  leaderboard,
}: {
  feedback: CompetitionFeedback[]
  leaderboard: LeaderboardEntry[]
}) {
  const [statusFilter, setStatusFilter] = useState('pending_review')

  const filtered = statusFilter === 'all'
    ? feedback
    : feedback.filter(f => f.admin_status === statusFilter)

  const stats = {
    total: feedback.length,
    pending: feedback.filter(f => f.admin_status === 'pending_review').length,
    reviewed: feedback.filter(f => f.admin_status !== 'pending_review').length,
    participants: leaderboard.length,
    totalPoints: leaderboard.reduce((sum, e) => sum + e.total_points, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/co-builder"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Admin Panel - Co-Builder</h1>
          <p className="text-sm text-muted-foreground">
            Review feedback dan kelola kompetisi
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Feedback</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.reviewed}</div>
            <div className="text-xs text-muted-foreground">Sudah Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.participants}</div>
            <div className="text-xs text-muted-foreground">Peserta</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <div className="text-xs text-muted-foreground">Total Poin</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua ({feedback.length})</SelectItem>
            <SelectItem value="pending_review">Pending ({stats.pending})</SelectItem>
            <SelectItem value="acknowledged">Diterima</SelectItem>
            <SelectItem value="in_progress">Diproses</SelectItem>
            <SelectItem value="fixed">Diperbaiki</SelectItem>
            <SelectItem value="implemented">Diimplementasi</SelectItem>
            <SelectItem value="wont_fix">Tidak Diperbaiki</SelectItem>
            <SelectItem value="duplicate">Duplikat</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} feedback</span>
      </div>

      {/* Feedback Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Tipe</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead className="w-[120px]">Pengirim</TableHead>
                <TableHead className="w-[80px]">Effort</TableHead>
                <TableHead className="w-[80px]">Impact</TableHead>
                <TableHead className="w-[80px] text-right">Poin</TableHead>
                <TableHead className="w-[100px]">Tanggal</TableHead>
                <TableHead className="w-[80px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Tidak ada feedback
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((fb) => {
                  const cat = CATEGORY_ICONS[fb.category] || CATEGORY_ICONS.question
                  const CatIcon = cat.icon
                  return (
                    <TableRow key={fb.id}>
                      <TableCell>
                        <CatIcon className={`h-4 w-4 ${cat.color}`} />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px]">
                          <p className="font-medium truncate">{fb.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{fb.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {fb.user_name || 'Unknown'}
                        <br />
                        <span className="text-xs text-muted-foreground">{fb.user_role}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{fb.effort_level}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={fb.impact_level === 'pending' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {fb.impact_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fb.total_points}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(fb.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short',
                        })}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/co-builder/admin/feedback/${fb.id}`}>
                            <Eye className="h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
