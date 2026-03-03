'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Feedback] Page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Terjadi Kesalahan</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        Maaf, terjadi masalah saat memuat halaman ini. Silakan coba lagi atau hubungi admin jika masalah berlanjut.
      </p>
      <Button onClick={reset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Coba Lagi
      </Button>
    </div>
  )
}
