import { Suspense } from 'react'

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="flex items-center justify-center py-8">Loading...</div>}>
        {children}
      </Suspense>
    </div>
  )
}
