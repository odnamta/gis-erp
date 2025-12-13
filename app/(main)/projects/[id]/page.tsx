import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { ArrowLeft, Building2, MapPin, Calendar, FolderOpen, FileText, ClipboardList } from 'lucide-react'

interface ProjectDetailPageProps {
  params: { id: string }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, customers(id, name, email)')
    .eq('id', params.id)
    .single()

  if (error || !project) {
    notFound()
  }

  const { data: pjos } = await supabase
    .from('proforma_job_orders')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  const { data: jos } = await supabase
    .from('job_orders')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-muted-foreground">Project details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <Link
                  href={`/customers/${project.customers?.id}`}
                  className="font-medium hover:underline"
                >
                  {project.customers?.name || '-'}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Site Address</p>
                <p className="font-medium">{project.description || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {project.created_at
                    ? new Date(project.created_at).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Proforma Job Orders (PJOs)
            </CardTitle>
            <CardDescription>Quotations for this project</CardDescription>
          </CardHeader>
          <CardContent>
            {pjos && pjos.length > 0 ? (
              <div className="space-y-2">
                {pjos.map((pjo) => (
                  <div
                    key={pjo.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{pjo.pjo_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {pjo.description}
                      </p>
                    </div>
                    <StatusBadge status={pjo.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No PJOs yet for this project.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Job Orders (JOs)
            </CardTitle>
            <CardDescription>Active work orders for this project</CardDescription>
          </CardHeader>
          <CardContent>
            {jos && jos.length > 0 ? (
              <div className="space-y-2">
                {jos.map((jo) => (
                  <div
                    key={jo.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{jo.jo_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {jo.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">
                        Rp {jo.amount?.toLocaleString('id-ID') || '0'}
                      </span>
                      <StatusBadge status={jo.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No Job Orders yet for this project.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
