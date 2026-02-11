'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Trophy,
  Lock,
  Loader2,
  CheckCircle2,
  GripVertical,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { submitTop5 } from '../actions'
import type { UserCompetitionStats } from '../actions'

const CATEGORIES = [
  { value: 'feature', label: 'Fitur Baru' },
  { value: 'improvement', label: 'Peningkatan' },
  { value: 'bug_fix', label: 'Perbaikan Bug' },
  { value: 'ux', label: 'Peningkatan UX' },
  { value: 'performance', label: 'Performa' },
]

interface Top5Item {
  rank: number
  title: string
  description: string
  category: string
}

export function Top5Client({ stats }: { stats: UserCompetitionStats | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [additionalComments, setAdditionalComments] = useState('')
  const [items, setItems] = useState<Top5Item[]>(
    Array.from({ length: 5 }, (_, i) => ({
      rank: i + 1,
      title: '',
      description: '',
      category: '',
    }))
  )

  // Check if week 3+ (Feb 26)
  const now = new Date()
  const week3Start = new Date('2026-02-26T00:00:00+07:00')
  const isLocked = now < week3Start
  const hasSubmitted = stats?.hasSubmittedTop5 || false

  function updateItem(index: number, field: keyof Top5Item, value: string) {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const isValid = items.every(item => item.title && item.description && item.category)

  async function handleSubmit() {
    if (!isValid) return
    setIsSubmitting(true)

    const result = await submitTop5({
      items,
      additionalComments: additionalComments || undefined,
    })

    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: `+${result.points} poin!`,
        description: 'Top 5 berhasil dikirim',
      })
      router.refresh()
    } else {
      toast({
        title: 'Gagal',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  if (hasSubmitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/co-builder"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-green-600">Top 5 Sudah Dikirim</h2>
            <p className="text-muted-foreground mt-2">Terima kasih! Top 5 kamu sudah tercatat.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLocked) {
    const daysLeft = Math.ceil((week3Start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/co-builder"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Top 5 Perubahan</h1>
            <p className="text-sm text-muted-foreground">Belum dibuka</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold">Belum Tersedia</h2>
            <p className="text-muted-foreground mt-2 text-center">
              Top 5 baru bisa dikirim mulai 26 Februari 2026 (Minggu ke-3)
            </p>
            <Badge variant="secondary" className="mt-4">
              {daysLeft} hari lagi
            </Badge>
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
          <Link href="/co-builder"><ArrowLeft className="mr-2 h-4 w-4" />Kembali</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Top 5 Perubahan</h1>
          <p className="text-sm text-muted-foreground">
            Pilih 5 perubahan paling berdampak di GAMA ERP (+30 pts)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Top 5</CardTitle>
          <CardDescription>
            Urutkan dari yang paling berdampak (#1) ke yang paling sedikit (#5)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex items-start pt-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                  #{item.rank}
                </div>
              </div>
              <div className="flex-1 space-y-3 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label>Judul *</Label>
                  <Input
                    placeholder="Nama perubahan/fitur"
                    value={item.title}
                    onChange={(e) => updateItem(idx, 'title', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select
                    value={item.category}
                    onValueChange={(v) => updateItem(idx, 'category', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alasan *</Label>
                  <Textarea
                    placeholder="Mengapa perubahan ini penting?"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Additional Comments */}
          <div className="space-y-2">
            <Label>Komentar Tambahan</Label>
            <Textarea
              placeholder="Komentar tambahan tentang pengalaman menggunakan GAMA ERP..."
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600"
            size="lg"
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</>
            ) : (
              <><Trophy className="mr-2 h-4 w-4" />Kirim Top 5 (+30 pts)</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
