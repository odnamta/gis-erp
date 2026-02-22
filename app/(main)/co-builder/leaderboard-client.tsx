'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Trophy, Clock, Target, Flame, Calendar, Star, CheckCircle, XCircle,
  Medal, Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LeaderboardEntry, UserCompetitionStats } from './actions'

const COMPETITION_END = new Date('2026-03-12T23:59:59+07:00')
const COMPETITION_START = new Date('2026-02-12T00:00:00+07:00')

const WEEK_PHASES = [
  { week: 1, start: '12 Feb', end: '18 Feb', label: 'Guided Exploration', desc: 'Ikuti test scenario' },
  { week: 2, start: '19 Feb', end: '25 Feb', label: 'Free Exploration', desc: 'Jelajahi semua fitur' },
  { week: 3, start: '26 Feb', end: '4 Mar', label: 'Deep Dive', desc: 'Cari bug tersembunyi' },
  { week: 4, start: '5 Mar', end: '12 Mar', label: 'Final Sprint', desc: 'Submit Top 5 + feedback terakhir' },
]

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', director: 'Director', marketing_manager: 'Marketing Manager',
  finance_manager: 'Finance Manager', operations_manager: 'Operations Manager',
  sysadmin: 'Sysadmin', administration: 'Administration', finance: 'Finance',
  marketing: 'Marketing', ops: 'Operations', engineer: 'Engineer',
  hr: 'HR', hse: 'HSE', agency: 'Agency', customs: 'Customs',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatRelativeTime(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays < 7) return `${diffDays} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getCurrentWeek() {
  const now = new Date()
  const start = COMPETITION_START
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000)
  if (diffDays < 0) return 0
  return Math.min(Math.floor(diffDays / 7) + 1, 4)
}

interface Props {
  leaderboard: LeaderboardEntry[]
  stats: UserCompetitionStats | null
  activity: { user_name: string; action: string; time: string }[]
}

export function LeaderboardClient({ leaderboard, stats, activity }: Props) {
  const [countdown, setCountdown] = useState('')
  const currentWeek = getCurrentWeek()

  useEffect(() => {
    function updateCountdown() {
      const now = new Date()
      const diff = COMPETITION_END.getTime() - now.getTime()
      if (diff <= 0) {
        setCountdown('Kompetisi telah berakhir')
        return
      }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      setCountdown(`${days} hari ${hours} jam tersisa`)
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-7 w-7" />
              GAMA ERP Co-Builder Program
            </h1>
            <p className="mt-1 text-white/80">Jelajahi, temukan bug, kasih saran — dapatkan hadiah!</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-white/90">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{countdown}</span>
            </div>
            <p className="text-sm text-white/70 mt-1">Berakhir 12 Maret 2026</p>
          </div>
        </div>

        {/* Prize Tiers */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Badge className="bg-yellow-400/20 text-white border-yellow-400/40 text-sm">🥇 Rp 3.000.000</Badge>
          <Badge className="bg-gray-300/20 text-white border-gray-300/40 text-sm">🥈 Rp 2.000.000</Badge>
          <Badge className="bg-amber-600/20 text-white border-amber-600/40 text-sm">🥉 Rp 1.500.000</Badge>
          <Badge className="bg-white/10 text-white border-white/20 text-sm">4th Rp 1.000.000</Badge>
          <Badge className="bg-white/10 text-white border-white/20 text-sm">5th Rp 750.000</Badge>
        </div>
        <p className="mt-2 text-sm text-white/70">
          Semua peserta yang memenuhi syarat: Rp 250.000 &bull; Perfect Attendance: +Rp 150.000
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-orange-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Belum ada peserta</p>
                  <p className="text-sm">Kirim feedback pertamamu untuk memulai!</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>Peserta</TableHead>
                        <TableHead className="text-right">Poin</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Feedback</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Skenario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry) => (
                        <TableRow
                          key={entry.user_id}
                        >
                          <TableCell>
                            {entry.rank === 1 && <span className="text-lg">🥇</span>}
                            {entry.rank === 2 && <span className="text-lg">🥈</span>}
                            {entry.rank === 3 && <span className="text-lg">🥉</span>}
                            {entry.rank > 3 && <span className="text-muted-foreground font-medium">{entry.rank}</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={entry.avatar_url || ''} />
                                <AvatarFallback className="text-xs">{getInitials(entry.user_name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {entry.user_name}
                                </div>
                                <div className="text-xs text-muted-foreground">{ROLE_LABELS[entry.user_role] || entry.user_role}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">{entry.total_points}</TableCell>
                          <TableCell className="text-right tabular-nums hidden sm:table-cell">{entry.feedback_count}</TableCell>
                          <TableCell className="text-right tabular-nums hidden md:table-cell">{entry.scenarios_completed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Phase */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline Kompetisi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {WEEK_PHASES.map((phase) => (
                  <div
                    key={phase.week}
                    className={`flex items-start gap-3 rounded-lg p-3 ${
                      currentWeek === phase.week
                        ? 'bg-orange-50 border border-orange-200'
                        : currentWeek > phase.week
                          ? 'opacity-60'
                          : 'bg-muted/30'
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      currentWeek === phase.week
                        ? 'bg-orange-500 text-white'
                        : currentWeek > phase.week
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentWeek > phase.week ? '✓' : phase.week}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        Minggu {phase.week} ({phase.start} - {phase.end})
                        {currentWeek === phase.week && (
                          <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 text-xs">Sekarang</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{phase.label} — {phase.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Personal Stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-orange-500" />
                  Statistik Kamu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">{stats.totalPoints}</div>
                  <div className="text-sm text-muted-foreground">Total Poin</div>
                  <div className="mt-1 text-sm font-medium">
                    Rank #{stats.rank} dari {stats.totalParticipants} peserta
                  </div>
                </div>

                {stats.currentStreak > 0 && (
                  <div className="flex items-center justify-center gap-1 text-orange-600">
                    <Flame className="h-4 w-4" />
                    <span className="font-medium text-sm">{stats.currentStreak} hari streak!</span>
                  </div>
                )}

                {/* Minimum Requirements */}
                <div className="space-y-3 pt-2">
                  <div className="text-sm font-medium">Syarat Minimum:</div>

                  <RequirementRow
                    label="Aktif 10 hari"
                    current={stats.loginDays}
                    target={10}
                    met={stats.loginDays >= 10}
                  />
                  <RequirementRow
                    label="5 feedback"
                    current={stats.feedbackCount}
                    target={5}
                    met={stats.feedbackCount >= 5}
                  />
                  <RequirementRow
                    label="2 skenario"
                    current={stats.scenariosCompleted}
                    target={2}
                    met={stats.scenariosCompleted >= 2}
                  />
                  <div className="flex items-center gap-2 text-sm">
                    {stats.hasSubmittedTop5 ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={stats.hasSubmittedTop5 ? 'text-green-700' : ''}>
                      Submit Top 5
                    </span>
                  </div>
                </div>

                {/* Perfect Attendance Tracker */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Perfect Attendance (+Rp 150.000)
                  </div>
                  <RequirementRow
                    label="Hadir hari kerja"
                    current={stats.perfectAttendance.activeDays}
                    target={stats.perfectAttendance.totalRequired}
                    met={stats.perfectAttendance.onTrack && stats.perfectAttendance.activeDays === stats.perfectAttendance.totalRequired}
                  />
                  {stats.perfectAttendance.missedDays > 0 ? (
                    <p className="text-xs text-red-500">
                      Missed {stats.perfectAttendance.missedDays} hari kerja
                    </p>
                  ) : stats.perfectAttendance.activeDays > 0 ? (
                    <p className="text-xs text-green-600">
                      On track! Jangan sampai terlewat
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Mulai 23 Feb — aktif setiap hari kerja (Sen-Jum)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Aktivitas Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada aktivitas</p>
              ) : (
                <div className="space-y-3">
                  {activity.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="h-2 w-2 mt-1.5 rounded-full bg-orange-400 shrink-0" />
                      <div>
                        <span className="font-medium">{item.user_name}</span>{' '}
                        <span className="text-muted-foreground">{item.action}</span>
                        <div className="text-xs text-muted-foreground">{formatRelativeTime(item.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RequirementRow({ label, current, target, met }: {
  label: string; current: number; target: number; met: boolean
}) {
  const percent = Math.min((current / target) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {met ? (
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <Target className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className={met ? 'text-green-700' : ''}>{label}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{current}/{target}</span>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  )
}
