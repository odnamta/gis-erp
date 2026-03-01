import { getTools } from '@/lib/tools-actions'
import { ToolsClient } from './tools-client'

export default async function ToolsPage() {
  const { data: tools, error } = await getTools()

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alat & Sparepart</h2>
          <p className="text-muted-foreground">Kelola inventaris alat dan sparepart</p>
        </div>
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Gagal memuat data: {error}</p>
        </div>
      </div>
    )
  }

  return <ToolsClient tools={tools} />
}
