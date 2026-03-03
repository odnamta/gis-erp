export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
          </div>
        ))}
      </div>
      {/* Charts area */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 h-64" />
        <div className="rounded-lg border bg-card p-6 h-64" />
      </div>
    </div>
  )
}
