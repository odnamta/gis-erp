export default function JobOrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="h-10 w-64 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-3">
            <div className="h-10 bg-muted/50 animate-pulse rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
