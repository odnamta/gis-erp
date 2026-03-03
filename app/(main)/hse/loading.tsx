export default function HSELoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 h-32">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
