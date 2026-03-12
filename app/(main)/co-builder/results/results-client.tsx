'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Trophy,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Target,
  Users,
  Award,
  Crown,
  Medal,
  Star,
} from 'lucide-react'
import type { CompetitionResults } from '../actions'

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

const RANK_STYLES: Record<number, { bg: string; border: string; text: string; icon: typeof Crown }> = {
  1: { bg: 'bg-gradient-to-br from-yellow-50 to-amber-50', border: 'border-yellow-300 ring-2 ring-yellow-200', text: 'text-yellow-700', icon: Crown },
  2: { bg: 'bg-gradient-to-br from-slate-50 to-gray-100', border: 'border-gray-300 ring-2 ring-gray-200', text: 'text-gray-600', icon: Medal },
  3: { bg: 'bg-gradient-to-br from-orange-50 to-amber-50', border: 'border-amber-300 ring-2 ring-amber-200', text: 'text-amber-700', icon: Award },
}

export function ResultsClient({ results }: { results: CompetitionResults }) {
  const [countdown, setCountdown] = useState('')
  const competitionEnd = new Date(results.competitionEnd) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function updateCountdown() {
      const now = new Date()
      const diff = competitionEnd.getTime() - now.getTime()
      if (diff <= 0) {
        setCountdown('Kompetisi telah berakhir!')
        return
      }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      setCountdown(`${days} hari ${hours} jam ${mins} menit tersisa`)
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [competitionEnd])

  const eligibleCount = results.entries.filter(e => e.prize_eligible).length
  const totalPrizePool = results.entries.reduce((s, e) => s + e.prize_amount + e.participation_bonus, 0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/co-builder"><ArrowLeft className="mr-2 h-4 w-4" />Kembali ke Leaderboard</Link>
      </Button>

      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">
                {results.isCompetitionOver ? 'Hasil Akhir Kompetisi' : 'Posisi Sementara'}
              </h1>
              <p className="text-white/80">GAMA ERP Co-Builder Program</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-white/90">
            <Clock className="h-4 w-4" />
            <span className="font-medium">{countdown}</span>
          </div>

          {!results.isCompetitionOver && (
            <p className="mt-2 text-sm text-white/70">
              Posisi dan hadiah bisa berubah sampai kompetisi berakhir. Pastikan semua syarat terpenuhi!
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <div className="text-2xl font-bold">{results.totalParticipants}</div>
            <div className="text-xs text-muted-foreground">Peserta</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold">{results.totalFeedback}</div>
            <div className="text-xs text-muted-foreground">Feedback</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold">{results.totalScenarios}</div>
            <div className="text-xs text-muted-foreground">Skenario</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <div className="text-2xl font-bold">{eligibleCount}</div>
            <div className="text-xs text-muted-foreground">Memenuhi Syarat</div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 Podium — order: 2nd (left), 1st (center, bigger), 3rd (right) */}
      {results.entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {[1, 0, 2].map((podiumIdx) => {
            const entry = results.entries[podiumIdx]
            if (!entry) return null
            const rank = podiumIdx + 1
            const style = RANK_STYLES[rank]
            const RankIcon = style?.icon || Star
            const isFirst = rank === 1

            return (
              <Card key={entry.user_id} className={`${style?.bg || ''} ${style?.border || ''}`}>
                <CardContent className={`p-4 text-center ${isFirst ? 'py-6' : ''}`}>
                  <RankIcon className={`h-6 w-6 mx-auto mb-2 ${style?.text || 'text-muted-foreground'}`} />
                  <Avatar className={`mx-auto mb-2 ${isFirst ? 'h-16 w-16' : 'h-12 w-12'}`}>
                    <AvatarImage src={entry.avatar_url || ''} />
                    <AvatarFallback className={isFirst ? 'text-lg' : 'text-sm'}>{getInitials(entry.user_name)}</AvatarFallback>
                  </Avatar>
                  <div className={`font-bold ${isFirst ? 'text-lg' : 'text-sm'}`}>{entry.user_name.trim()}</div>
                  <div className="text-xs text-muted-foreground">{ROLE_LABELS[entry.user_role] || entry.user_role}</div>
                  <div className={`font-bold mt-2 ${isFirst ? 'text-2xl' : 'text-xl'} text-orange-600`}>
                    {entry.total_points.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-muted-foreground">poin</div>
                  {entry.prize_eligible && entry.prize_amount > 0 && (
                    <Badge className="mt-2 bg-green-100 text-green-700 border-green-300">
                      {formatCurrency(entry.prize_amount)}
                    </Badge>
                  )}
                  {!entry.prize_eligible && (
                    <Badge variant="outline" className="mt-2 text-xs text-muted-foreground">
                      Syarat belum lengkap
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Full Standings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-orange-500" />
            Klasemen {results.isCompetitionOver ? 'Akhir' : 'Sementara'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {results.entries.map((entry) => (
            <div
              key={entry.user_id}
              className={`rounded-lg border p-4 ${
                entry.prize_eligible
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Rank */}
                <div className="text-center shrink-0 w-10">
                  {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                  {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                  {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                  {entry.rank > 3 && (
                    <span className="text-lg font-bold text-muted-foreground">#{entry.rank}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.avatar_url || ''} />
                      <AvatarFallback className="text-xs">{getInitials(entry.user_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{entry.user_name.trim()}</div>
                      <div className="text-xs text-muted-foreground">{ROLE_LABELS[entry.user_role] || entry.user_role}</div>
                    </div>
                  </div>

                  {/* Requirements Checklist */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <RequirementBadge
                      label={`${entry.requirements.activeDays.value}/10 hari aktif`}
                      met={entry.requirements.activeDays.met}
                    />
                    <RequirementBadge
                      label={`${entry.requirements.feedbackCount.value}/5 feedback`}
                      met={entry.requirements.feedbackCount.met}
                    />
                    <RequirementBadge
                      label={`${entry.requirements.scenariosCompleted.value}/2 skenario`}
                      met={entry.requirements.scenariosCompleted.met}
                    />
                    <RequirementBadge
                      label="Top 5 submitted"
                      met={entry.requirements.hasTop5}
                    />
                  </div>
                </div>

                {/* Points + Prize */}
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-orange-600">
                    {entry.total_points.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-muted-foreground">poin</div>
                  {entry.prize_eligible && entry.prize_amount > 0 && (
                    <div className="mt-1">
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                        {formatCurrency(entry.prize_amount)}
                      </Badge>
                    </div>
                  )}
                  {entry.prize_eligible && (
                    <div className="text-xs text-green-600 mt-1">
                      + {formatCurrency(entry.participation_bonus)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Prize Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Struktur Hadiah</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span>🥇 Juara 1</span>
              <span className="font-bold">Rp 3.000.000</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>🥈 Juara 2</span>
              <span className="font-bold">Rp 2.000.000</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>🥉 Juara 3</span>
              <span className="font-bold">Rp 1.500.000</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Juara 4</span>
              <span className="font-bold">Rp 1.000.000</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Juara 5</span>
              <span className="font-bold">Rp 750.000</span>
            </div>
            <div className="flex justify-between py-2 border-b text-muted-foreground">
              <span>Bonus Partisipasi (memenuhi syarat)</span>
              <span className="font-medium">Rp 250.000</span>
            </div>
            <div className="flex justify-between py-2 text-muted-foreground">
              <span>Perfect Attendance</span>
              <span className="font-medium">+ Rp 150.000</span>
            </div>
          </div>

          {totalPrizePool > 0 && (
            <div className="mt-4 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm">
              <span className="text-orange-800">Total hadiah {results.isCompetitionOver ? 'terdistribusi' : 'sementara'}: </span>
              <span className="font-bold text-orange-600">{formatCurrency(totalPrizePool)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligibility Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Syarat Minimum Hadiah</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span>Aktif minimal 10 hari kerja</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span>Kirim minimal 5 feedback</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span>Selesaikan minimal 2 test scenario</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span>Submit Top 5 Perubahan Terbesar</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Peserta yang tidak memenuhi semua syarat tidak berhak atas hadiah, terlepas dari posisi di leaderboard.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function RequirementBadge({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-1 rounded-md px-2 py-1 ${
      met ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {met ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" />
      ) : (
        <XCircle className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </div>
  )
}
