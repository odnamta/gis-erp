'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  MessageSquarePlus,
  Bug,
  Frown,
  Lightbulb,
  ThumbsUp,
  HelpCircle,
  Upload,
  Loader2,
  Sparkles,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { submitCompetitionFeedback, uploadCompetitionScreenshot } from '@/app/(main)/co-builder/actions'
import { calculateEffortLevel } from '@/lib/co-builder-utils'

const CATEGORIES = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500' },
  { value: 'ux_issue', label: 'UX Issue', icon: Frown, color: 'text-orange-500' },
  { value: 'suggestion', label: 'Saran', icon: Lightbulb, color: 'text-blue-500' },
  { value: 'praise', label: 'Pujian', icon: ThumbsUp, color: 'text-green-500' },
  { value: 'question', label: 'Pertanyaan', icon: HelpCircle, color: 'text-purple-500' },
]

export function CompetitionFeedbackButton() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [earnedBonuses, setEarnedBonuses] = useState<string[]>([])
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Point preview
  const effortPreview = calculateEffortLevel({
    description,
    steps_to_reproduce: stepsToReproduce,
    suggestion,
    screenshot_url: screenshotUrl,
  })

  const descLength = description.length
  const isPraise = category === 'praise'
  const isDescValid = isPraise || descLength >= 20

  function resetForm() {
    setCategory('')
    setTitle('')
    setDescription('')
    setStepsToReproduce('')
    setSuggestion('')
    setScreenshotUrl('')
    setScreenshotPreview('')
  }

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setScreenshotPreview(URL.createObjectURL(file))

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadCompetitionScreenshot(formData)
    setIsUploading(false)

    if (result.url) {
      setScreenshotUrl(result.url)
    } else {
      setScreenshotPreview('')
    }
  }

  async function handleSubmit() {
    if (!category || !title || !description) return
    if (!isDescValid) return

    setIsSubmitting(true)
    const result = await submitCompetitionFeedback({
      category,
      title,
      description,
      steps_to_reproduce: stepsToReproduce || undefined,
      suggestion: suggestion || undefined,
      page_url: pathname,
      screenshot_url: screenshotUrl || undefined,
    })
    setIsSubmitting(false)

    if (result.success) {
      setEarnedPoints(result.points || 0)
      setEarnedBonuses(result.bonuses || [])
      setShowSuccess(true)
      resetForm()

      setTimeout(() => {
        setShowSuccess(false)
        setIsOpen(false)
      }, 3000)
    } else {
      toast({
        title: 'Gagal',
        description: result.error || 'Gagal mengirim feedback',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => { setShowSuccess(false); setIsOpen(true) }}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-all hover:bg-orange-600 hover:scale-105 active:scale-95"
        title="Kirim Feedback"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </button>

      {/* Feedback Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[100vw] sm:max-w-lg overflow-y-auto p-4 sm:p-6">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              {/* Success Animation */}
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                  <Sparkles className="h-12 w-12 text-green-500" />
                </div>
                {/* Confetti-like particles */}
                <div className="absolute -top-4 -left-4 h-3 w-3 rounded-full bg-yellow-400 animate-ping" />
                <div className="absolute -top-2 right-0 h-2 w-2 rounded-full bg-blue-400 animate-ping" style={{ animationDelay: '0.2s' }} />
                <div className="absolute bottom-0 -left-2 h-2 w-2 rounded-full bg-pink-400 animate-ping" style={{ animationDelay: '0.4s' }} />
                <div className="absolute -bottom-2 right-2 h-3 w-3 rounded-full bg-purple-400 animate-ping" style={{ animationDelay: '0.1s' }} />
              </div>
              <h3 className="text-2xl font-bold text-green-600">+{earnedPoints} pts!</h3>
              <p className="text-muted-foreground text-center">Feedback berhasil dikirim!</p>
              {earnedBonuses.includes('first_of_day') && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Feedback pertama hari ini! +2 pts
                </Badge>
              )}
              {earnedBonuses.includes('streak') && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Streak bonus! +3 pts
                </Badge>
              )}
              {earnedBonuses.includes('collaboration') && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Kolaborasi bonus! +5 pts
                </Badge>
              )}
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Kirim Feedback</SheetTitle>
                <SheetDescription>
                  Bantu kami membuat GAMA ERP lebih baik!
                </SheetDescription>
              </SheetHeader>

              {/* Anti-split warning */}
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Satu masalah = satu feedback. Gabungkan masalah yang sama dalam satu laporan.
              </div>

              <div className="mt-6 space-y-5">
                {/* Category */}
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-all ${
                            category === cat.value
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${cat.color}`} />
                          <span>{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="fb-title">Judul *</Label>
                  <Input
                    id="fb-title"
                    placeholder={
                      category === 'bug'
                        ? 'Contoh: "Tidak bisa simpan quotation baru"'
                        : category === 'ux_issue'
                        ? 'Contoh: "Tombol hapus dan edit terlalu berdekatan"'
                        : 'Ringkasan singkat masalah/saran'
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                  />
                </div>

                {/* Quality tip for bugs */}
                {category === 'bug' && !description && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
                    <p className="font-semibold">Tips laporan bug yang baik:</p>
                    <ul className="list-disc ml-4 space-y-0.5">
                      <li>Sebutkan <strong>halaman</strong> mana yang bermasalah</li>
                      <li>Jelaskan <strong>apa yang terjadi</strong> vs <strong>apa yang seharusnya</strong></li>
                      <li>Sertakan <strong>screenshot</strong> jika ada error</li>
                      <li>Bug yang detail + screenshot = hingga <strong>15 poin</strong> (vs 3 poin untuk laporan singkat)</li>
                    </ul>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="fb-desc">Deskripsi *</Label>
                  <Textarea
                    id="fb-desc"
                    placeholder={
                      category === 'bug'
                        ? 'Apa yang terjadi? Di halaman mana? Apa yang seharusnya terjadi?\n\nContoh: "Saat klik tombol Simpan di halaman Quotation, muncul error dan data tidak tersimpan. Seharusnya quotation berhasil dibuat."'
                        : category === 'ux_issue'
                        ? 'Bagian mana yang membingungkan? Apa yang Anda harapkan?\n\nContoh: "Tombol hapus terlalu dekat dengan tombol edit, sering salah klik."'
                        : category === 'suggestion'
                        ? 'Fitur apa yang Anda inginkan? Mengapa ini penting?\n\nContoh: "Perlu fitur export PDF untuk invoice, karena klien sering minta softcopy."'
                        : 'Jelaskan secara detail...'
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={descLength < 20 && !isPraise ? 'text-red-500' : 'text-muted-foreground'}>
                      {descLength}/20 min {!isPraise && descLength < 20 && '— Tambahkan detail agar feedback kamu mendapat poin'}
                    </span>
                    <span className="text-muted-foreground">{descLength} karakter</span>
                  </div>
                </div>

                {/* Steps to Reproduce (for bugs/ux) */}
                {(category === 'bug' || category === 'ux_issue') && (
                  <div className="space-y-2">
                    <Label htmlFor="fb-steps">Langkah Reproduksi</Label>
                    <Textarea
                      id="fb-steps"
                      placeholder="1. Buka halaman...&#10;2. Klik tombol...&#10;3. Error muncul..."
                      value={stepsToReproduce}
                      onChange={(e) => setStepsToReproduce(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}

                {/* Suggestion */}
                <div className="space-y-2">
                  <Label htmlFor="fb-suggestion">Saran Perbaikan</Label>
                  <Textarea
                    id="fb-suggestion"
                    placeholder="Menurut saya, seharusnya..."
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Screenshot */}
                <div className="space-y-2">
                  <Label>Screenshot</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotUpload}
                  />
                  {screenshotPreview ? (
                    <div className="relative rounded-lg border overflow-hidden">
                      <img src={screenshotPreview} alt="Screenshot" className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setScreenshotUrl(''); setScreenshotPreview('') }}
                        className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span>Upload screenshot</span>
                    </button>
                  )}
                </div>

                {/* Point Preview */}
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                  <div className="font-medium">Estimasi Poin:</div>
                  {effortPreview.level === 'quick' && (
                    <div className="text-muted-foreground">
                      ⚡ Quick feedback: ~3 pts
                      {descLength < 50 && <span className="block text-xs mt-1">Tambahkan screenshot atau saran untuk poin lebih!</span>}
                    </div>
                  )}
                  {effortPreview.level === 'standard' && (
                    <div className="text-blue-600">📝 Standard feedback: ~8 pts</div>
                  )}
                  {effortPreview.level === 'detailed' && (
                    <div className="text-green-600 font-medium">📋 Detailed feedback: ~15 pts (great job!)</div>
                  )}
                </div>

                {/* Page URL indicator */}
                <div className="text-xs text-muted-foreground">
                  📍 Halaman: {pathname}
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={!category || !title || !description || !isDescValid || isSubmitting || isUploading}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Kirim Feedback
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
