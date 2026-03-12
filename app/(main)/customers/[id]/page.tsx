import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { AttachmentsSection } from '@/components/attachments'
import { CustomerRatesSection } from '@/components/customers/customer-rates-section'
import { ArrowLeft, Plus, Building2, Mail, Phone, MapPin, Calendar, Cake, FileText, Receipt, Clock } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils/format'

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

  const [projectsResult, invoicesResult, quotationsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .eq('customer_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, status, due_date, created_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('quotations')
      .select('id, quotation_number, status, total_revenue, created_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const projects = projectsResult.data
  const invoices = (invoicesResult.data || []) as unknown as { id: string; invoice_number: string; total_amount: number | null; status: string; due_date: string | null; created_at: string }[]
  const quotations = (quotationsResult.data || []) as unknown as { id: string; quotation_number: string; status: string; total_revenue: number | null; created_at: string }[]

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
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Termin Pembayaran</p>
                <p className="font-medium">
                  {(customer as Record<string, unknown>).payment_terms_days
                    ? `${(customer as Record<string, unknown>).payment_terms_days} hari`
                    : 'Default sistem'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Berdiri</p>
                <p className="font-medium">
                  {(customer as any).established_date // eslint-disable-line @typescript-eslint/no-explicit-any
                    ? formatDate((customer as any).established_date) // eslint-disable-line @typescript-eslint/no-explicit-any
                    : '-'}
                </p>
              </div>
            </div>
            {(() => {
              const estDate = (customer as any).established_date // eslint-disable-line @typescript-eslint/no-explicit-any
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

      {/* Quotations & Invoices */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quotations
              </CardTitle>
              <CardDescription>{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {quotations.length > 0 ? (
              <div className="space-y-2">
                {quotations.map((q) => (
                  <div key={q.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{q.quotation_number}</p>
                        <StatusBadge status={q.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(q.created_at)}
                        {q.total_revenue ? ` · ${formatCurrency(q.total_revenue)}` : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/quotations/${q.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada quotation untuk customer ini.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoices
              </CardTitle>
              <CardDescription>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{inv.invoice_number}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(inv.created_at)}
                        {inv.total_amount ? ` · ${formatCurrency(inv.total_amount)}` : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/invoices/${inv.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada invoice untuk customer ini.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Contract Rates */}
      <CustomerRatesSection customerId={customer.id} />

      {/* Attachments */}
      <AttachmentsSection
        entityType="customer"
        entityId={customer.id}
        title="Customer Documents"
      />
    </div>
  )
}
