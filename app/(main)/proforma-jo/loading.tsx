export default function ProformaJOLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="flex gap-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="rounded-md border">
        <div className="h-12 bg-muted/50 border-b" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b last:border-0" />
        ))}
      </div>
    </div>
  )
}
