'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  ShieldCheck,
} from 'lucide-react'
import type { CompetitionFeedback, CompetitionResults } from '../actions'

const CATEGORY_ICONS: Record<string, { icon: typeof Bug; color: string; label: string }> = {
  bug: { icon: Bug, color: 'text-red-500', label: 'Bug' },
  ux_issue: { icon: Frown, color: 'text-orange-500', label: 'UX' },
  suggestion: { icon: Lightbulb, color: 'text-blue-500', label: 'Saran' },
  praise: { icon: ThumbsUp, color: 'text-green-500', label: 'Pujian' },
  question: { icon: HelpCircle, color: 'text-purple-500', label: 'Tanya' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function AdminClient({
  feedback,
  results,
}: {
  feedback: CompetitionFeedback[]
  results: CompetitionResults
}) {
  const [statusFilter, setStatusFilter] = useState('pending_review')
  const [activeTab, setActiveTab] = useState<'feedback' | 'eligibility'>('feedback')

  const leaderboard = results.entries
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

  const eligibleCount = results.entries.filter(e => e.prize_eligible).length

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
        <Card className={eligibleCount > 0 ? 'border-green-200 bg-green-50/50' : ''}>
          <CardContent className="p-4 text-center">
            <ShieldCheck className={`h-5 w-5 mx-auto mb-1 ${eligibleCount > 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
            <div className={`text-2xl font-bold ${eligibleCount > 0 ? 'text-green-600' : ''}`}>{eligibleCount}/{stats.participants}</div>
            <div className="text-xs text-muted-foreground">Memenuhi Syarat</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'feedback' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('feedback')}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Feedback ({stats.total})
        </Button>
        <Button
          variant={activeTab === 'eligibility' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('eligibility')}
        >
          <Award className="mr-2 h-4 w-4" />
          Eligibility ({eligibleCount}/{stats.participants})
        </Button>
      </div>

      {activeTab === 'eligibility' && (
        <EligibilityPanel results={results} />
      )}

      {activeTab === 'feedback' && (
        <>
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
        </>
      )}
    </div>
  )
}

// ============================================================
// Eligibility Panel
// ============================================================

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', director: 'Director', marketing_manager: 'Mkt Mgr',
  finance_manager: 'Fin Mgr', operations_manager: 'Ops Mgr',
  sysadmin: 'Sysadmin', administration: 'Admin', finance: 'Finance',
  marketing: 'Marketing', ops: 'Ops', engineer: 'Engineer',
  hr: 'HR', hse: 'HSE', agency: 'Agency', customs: 'Customs',
}

function EligibilityPanel({ results }: { results: CompetitionResults }) {
  const entries = results.entries
  const _eligible = entries.filter(e => e.prize_eligible)
  const _ineligible = entries.filter(e => !e.prize_eligible)

  // Count missing requirements
  const missingActiveDays = entries.filter(e => !e.requirements.activeDays.met).length
  const missingFeedback = entries.filter(e => !e.requirements.feedbackCount.met).length
  const missingScenarios = entries.filter(e => !e.requirements.scenariosCompleted.met).length
  const missingTop5 = entries.filter(e => !e.requirements.hasTop5).length

  return (
    <div className="space-y-4">
      {/* Missing Requirements Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={missingActiveDays > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{missingActiveDays}</div>
            <div className="text-xs text-muted-foreground">Kurang Hari Aktif</div>
          </CardContent>
        </Card>
        <Card className={missingFeedback > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{missingFeedback}</div>
            <div className="text-xs text-muted-foreground">Kurang Feedback</div>
          </CardContent>
        </Card>
        <Card className={missingScenarios > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{missingScenarios}</div>
            <div className="text-xs text-muted-foreground">Kurang Skenario</div>
          </CardContent>
        </Card>
        <Card className={missingTop5 > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{missingTop5}</div>
            <div className="text-xs text-muted-foreground">Belum Top 5</div>
          </CardContent>
        </Card>
      </div>

      {/* Eligibility Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange-500" />
            Status Kelayakan Peserta
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Peserta</TableHead>
                <TableHead className="text-right w-[70px]">Poin</TableHead>
                <TableHead className="text-center w-[80px]">Hari Aktif</TableHead>
                <TableHead className="text-center w-[80px]">Feedback</TableHead>
                <TableHead className="text-center w-[80px]">Skenario</TableHead>
                <TableHead className="text-center w-[70px]">Top 5</TableHead>
                <TableHead className="text-right w-[120px]">Hadiah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={entry.user_id}
                  className={entry.prize_eligible ? 'bg-green-50/50' : ''}
                >
                  <TableCell className="font-medium text-muted-foreground">
                    {entry.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={entry.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">{getInitials(entry.user_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{entry.user_name.trim()}</div>
                        <div className="text-[10px] text-muted-foreground">{ROLE_LABELS[entry.user_role] || entry.user_role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{entry.total_points.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-center">
                    <ReqCell value={entry.requirements.activeDays.value} target={10} met={entry.requirements.activeDays.met} />
                  </TableCell>
                  <TableCell className="text-center">
                    <ReqCell value={entry.requirements.feedbackCount.value} target={5} met={entry.requirements.feedbackCount.met} />
                  </TableCell>
                  <TableCell className="text-center">
                    <ReqCell value={entry.requirements.scenariosCompleted.value} target={2} met={entry.requirements.scenariosCompleted.met} />
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.requirements.hasTop5 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.prize_eligible ? (
                      <div>
                        {entry.prize_amount > 0 && (
                          <div className="font-bold text-green-700 text-sm">{formatCurrency(entry.prize_amount)}</div>
                        )}
                        <div className="text-[10px] text-green-600">+ {formatCurrency(entry.participation_bonus)}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

function ReqCell({ value, target, met }: { value: number; target: number; met: boolean }) {
  return (
    <span className={`text-sm tabular-nums ${met ? 'text-green-600 font-medium' : 'text-red-500'}`}>
      {value}/{target}
    </span>
  )
}
