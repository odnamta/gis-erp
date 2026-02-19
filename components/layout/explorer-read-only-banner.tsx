'use client'

import { Globe, Eye } from 'lucide-react'

/**
 * Banner shown on permission-restricted pages when accessed via explorer mode.
 * Tells the user they have read-only access.
 */
export function ExplorerReadOnlyBanner() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <Globe className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-800">
          Mode Explorer — Hanya Lihat
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          Anda melihat halaman ini dalam mode explorer. Beberapa aksi mungkin tidak tersedia untuk role Anda.
        </p>
      </div>
      <Eye className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
    </div>
  )
}
