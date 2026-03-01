import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { AttachmentsSection } from '@/components/attachments'
import { ArrowLeft, Plus, Building2, Mail, Phone, MapPin, Calendar, Cake } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !customer) {
    notFound()
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('customer_id', id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{customer.name}</h2>
          <p className="text-muted-foreground">Customer details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{customer.email || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{customer.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{customer.address || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Berdiri</p>
                <p className="font-medium">
                  {(customer as any).established_date
                    ? formatDate((customer as any).established_date)
                    : '-'}
                </p>
              </div>
            </div>
            {(() => {
              const estDate = (customer as any).established_date
              if (!estDate) return null
              const today = new Date()
              const established = new Date(estDate)
              // Calculate next anniversary
              const anniversaryThisYear = new Date(
                today.getFullYear(),
                established.getMonth(),
                established.getDate()
              )
              const nextAnniversary =
                anniversaryThisYear >= today
                  ? anniversaryThisYear
                  : new Date(
                      today.getFullYear() + 1,
                      established.getMonth(),
                      established.getDate()
                    )
              const diffDays = Math.ceil(
                (nextAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              )
              if (diffDays <= 30) {
                return (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                    <Cake className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {diffDays === 0
                        ? 'Selamat Ulang Tahun Perusahaan hari ini!'
                        : `Ulang Tahun Perusahaan dalam ${diffDays} hari!`}
                    </span>
                  </div>
                )
              }
              return null
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Projects for this customer</CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href={`/projects?add=true&customer_id=${customer.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{project.name}</p>
                        <StatusBadge status={project.status} />
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No projects yet. Create the first project for this customer.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      <AttachmentsSection
        entityType="customer"
        entityId={customer.id}
        title="Customer Documents"
      />
    </div>
  )
}
