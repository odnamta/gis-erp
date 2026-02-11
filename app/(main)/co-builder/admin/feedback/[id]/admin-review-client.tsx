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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Bug,
  Frown,
  Lightbulb,
  ThumbsUp,
  HelpCircle,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { reviewFeedback } from '../../../actions'
import type { CompetitionFeedback } from '../../../actions'

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-red-500 bg-red-50' },
  ux_issue: { label: 'UX Issue', icon: Frown, color: 'text-orange-500 bg-orange-50' },
  suggestion: { label: 'Saran', icon: Lightbulb, color: 'text-blue-500 bg-blue-50' },
  praise: { label: 'Pujian', icon: ThumbsUp, color: 'text-green-500 bg-green-50' },
  question: { label: 'Pertanyaan', icon: HelpCircle, color: 'text-purple-500 bg-purple-50' },
}

export function AdminReviewClient({ feedback }: { feedback: CompetitionFeedback }) {
  const router = useRouter()
  const { toast } = useToast()
  const [impactLevel, setImpactLevel] = useState<'helpful' | 'important' | 'critical'>(
    feedback.impact_level !== 'pending' ? feedback.impact_level as 'helpful' | 'important' | 'critical' : 'helpful'
  )
  const [adminStatus, setAdminStatus] = useState(
    feedback.admin_status !== 'pending_review' ? feedback.admin_status : 'acknowledged'
  )
  const [adminResponse, setAdminResponse] = useState(feedback.admin_response || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cat = CATEGORY_CONFIG[feedback.category] || CATEGORY_CONFIG.question
  const CatIcon = cat.icon
  const multiplierMap = { helpful: 1, important: 2, critical: 3 }
  const previewPoints = feedback.base_points * multiplierMap[impactLevel]

  async function handleSubmit() {
    if (!adminResponse.trim()) return
    setIsSubmitting(true)

    const result = await reviewFeedback({
      feedbackId: feedback.id,
      impactLevel,
      adminStatus,
      adminResponse,
    })

    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: 'Review disimpan',
        description: `Feedback dinilai ${impactLevel} (${previewPoints} pts)`,
      })
      router.push('/co-builder/admin')
      router.refresh()
    } else {
      toast({
        title: 'Gagal',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  const createdDate = new Date(feedback.created_at).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/co-builder/admin"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
        </Button>
        <h1 className="text-2xl font-bold">Review Feedback</h1>
      </div>

      {/* Feedback Detail */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CatIcon className={`h-5 w-5 ${cat.color.split(' ')[0]}`} />
              <Badge variant="outline">{cat.label}</Badge>
              <Badge variant="secondary">{feedback.effort_level}</Badge>
            </div>
            <span className="text-sm text-muted-foreground">{createdDate}</span>
          </div>
          <CardTitle className="mt-2">{feedback.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Submitter info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{feedback.user_name || 'Unknown'}</span>
            <Badge variant="outline" className="text-xs">{feedback.user_role}</Badge>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Deskripsi</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{feedback.description}</p>
          </div>

          {/* Steps to Reproduce */}
          {feedback.steps_to_reproduce && (
            <div>
              <Label className="text-xs text-muted-foreground">Langkah Reproduksi</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{feedback.steps_to_reproduce}</p>
            </div>
          )}

          {/* Suggestion */}
          {feedback.suggestion && (
            <div>
              <Label className="text-xs text-muted-foreground">Saran Perbaikan</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{feedback.suggestion}</p>
            </div>
          )}

          {/* Page URL */}
          {feedback.page_url && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Halaman:</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{feedback.page_url}</code>
            </div>
          )}

          {/* Screenshot */}
          {feedback.screenshot_url && (
            <div>
              <Label className="text-xs text-muted-foreground">Screenshot</Label>
              <div className="mt-1 rounded-lg border overflow-hidden">
                <img src={feedback.screenshot_url} alt="Screenshot" className="w-full max-h-64 object-contain bg-muted" />
              </div>
            </div>
          )}

          {/* Current Points */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Poin saat ini: </span>
            <span className="font-bold">{feedback.total_points}</span>
            <span className="text-muted-foreground"> (base: {feedback.base_points}, multiplier: x{feedback.impact_multiplier})</span>
          </div>
        </CardContent>
      </Card>

      {/* Review Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Impact Level */}
          <div className="space-y-2">
            <Label>Impact Level</Label>
            <Select value={impactLevel} onValueChange={(v) => setImpactLevel(v as typeof impactLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="helpful">Helpful (x1 = {feedback.base_points} pts)</SelectItem>
                <SelectItem value="important">Important (x2 = {feedback.base_points * 2} pts)</SelectItem>
                <SelectItem value="critical">Critical (x3 = {feedback.base_points * 3} pts)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={adminStatus} onValueChange={setAdminStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acknowledged">Diterima</SelectItem>
                <SelectItem value="in_progress">Diproses</SelectItem>
                <SelectItem value="fixed">Diperbaiki (+5 bonus pts)</SelectItem>
                <SelectItem value="implemented">Diimplementasi (+10 bonus pts)</SelectItem>
                <SelectItem value="wont_fix">Tidak Diperbaiki</SelectItem>
                <SelectItem value="duplicate">Duplikat (poin direset ke 0)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Response */}
          <div className="space-y-2">
            <Label>Respon Admin *</Label>
            <Textarea
              placeholder="Tulis respon untuk pengirim feedback..."
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Point Preview */}
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm">
            <span className="text-orange-800">Poin setelah review: </span>
            <span className="font-bold text-orange-600">
              {adminStatus === 'duplicate' ? 0 : previewPoints} pts
            </span>
            {adminStatus === 'fixed' && <span className="text-orange-600"> + 5 bonus</span>}
            {adminStatus === 'implemented' && <span className="text-orange-600"> + 10 bonus</span>}
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!adminResponse.trim() || isSubmitting}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
              ) : (
                'Simpan Review'
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/co-builder/admin">Batal</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
