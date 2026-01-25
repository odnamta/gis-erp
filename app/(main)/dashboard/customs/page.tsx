import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCustomsDashboardMetrics } from '@/lib/dashboard/customs-data'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { 
  FileText, 
  FileInput, 
  FileOutput,
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  ArrowRight,
  AlertTriangle,
  DollarSign,
  Package,
  Calendar
} from 'lucide-react'

export const metadata = {
  title: 'Customs Dashboard | Gama ERP',
  description: 'Import/Export document tracking and customs management',
}

// Document type badge component
function DocumentTypeBadge({ type }: { type: 'PIB' | 'PEB' }) {
  const colors = {
    PIB: 'bg-blue-100 text-blue-800',
    PEB: 'bg-green-100 text-green-800',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[type]}`}>
      {type}
    </span>
  )
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    checking: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    released: 'bg-emerald-100 text-emerald-800',
    loaded: 'bg-teal-100 text-teal-800',
    departed: 'bg-cyan-100 text-cyan-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  
  const label = status.replace(/_/g, ' ')
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {label}
    </span>
  )
}

// Alert indicator component
function AlertIndicator({ type, count }: { type: 'danger' | 'warning' | 'success'; count: number }) {
  if (count === 0) return null
  
  const colors = {
    danger: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500',
  }
  
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white ${colors[type]}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Pipeline status indicator
function PipelineStatus({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm capitalize">{label}</span>
      </div>
      <span className="font-semibold">{formatNumber(count)}</span>
    </div>
  )
}

export default async function CustomsDashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Check access: customs role or executive roles
  const allowedRoles = ['customs', 'owner', 'director', 'finance_manager']
  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch real metrics
  const metrics = await getCustomsDashboardMetrics(profile.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customs Dashboard</h1>
          <p className="text-muted-foreground">
            Import/Export document tracking and customs management
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link 
          href="/customs/import/new"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          New PIB
        </Link>
        <Link 
          href="/customs/export/new"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          New PEB
        </Link>
        <Link 
          href="/customs/import"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          View All PIB
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link 
          href="/customs/export"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          View All PEB
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link 
          href="/customs/fees?status=unpaid"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          Pending Fees
          {metrics.unpaidFeesCount > 0 && (
            <AlertIndicator type="warning" count={metrics.unpaidFeesCount} />
          )}
        </Link>
      </div>

      {/* Document Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Document Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <FileInput className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">PIB Pending</h3>
            </div>
            <div className="text-2xl font-bold mt-2 text-blue-600">{formatNumber(metrics.pibPending)}</div>
            <p className="text-sm text-muted-foreground">Import declarations</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <h3 className="font-semibold text-sm">PIB Completed</h3>
            </div>
            <div className="text-2xl font-bold mt-2 text-emerald-600">{formatNumber(metrics.pibCompleted)}</div>
            <p className="text-sm text-muted-foreground">Released</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <FileOutput className="h-4 w-4 text-green-500" />
              <h3 className="font-semibold text-sm">PEB Pending</h3>
            </div>
            <div className="text-2xl font-bold mt-2 text-green-600">{formatNumber(metrics.pebPending)}</div>
            <p className="text-sm text-muted-foreground">Export declarations</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-teal-500" />
              <h3 className="font-semibold text-sm">PEB Completed</h3>
            </div>
            <div className="text-2xl font-bold mt-2 text-teal-600">{formatNumber(metrics.pebCompleted)}</div>
            <p className="text-sm text-muted-foreground">Departed</p>
          </div>
          <div className="rounded-lg border p-4 bg-accent/50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">This Month</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.documentsThisMonth)}</div>
            <p className="text-sm text-muted-foreground">Total documents</p>
          </div>
        </div>
      </div>

      {/* Document Pipeline */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Document Pipeline</h2>
        <div className="rounded-lg border p-4">
          <div className="divide-y">
            <PipelineStatus label="Draft" count={metrics.documentsByStatus.draft} color="bg-gray-400" />
            <PipelineStatus label="Submitted" count={metrics.documentsByStatus.submitted} color="bg-blue-400" />
            <PipelineStatus label="Processing" count={metrics.documentsByStatus.processing} color="bg-yellow-400" />
            <PipelineStatus label="Cleared" count={metrics.documentsByStatus.cleared} color="bg-green-400" />
            <PipelineStatus label="Rejected" count={metrics.documentsByStatus.rejected} color="bg-red-400" />
          </div>
        </div>
      </div>

      {/* Duty Tracking */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Duty Tracking</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <h3 className="font-semibold text-sm">Paid This Month</h3>
            </div>
            <div className="text-2xl font-bold mt-2 text-emerald-600">
              {formatCurrency(metrics.dutiesPaidThisMonth)}
            </div>
            <p className="text-sm text-muted-foreground">Customs duties & fees</p>
          </div>
          <div className={`rounded-lg border p-4 ${metrics.unpaidFeesCount > 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Unpaid Fees</h3>
              </div>
              {metrics.unpaidFeesCount > 0 && <AlertIndicator type="warning" count={metrics.unpaidFeesCount} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-yellow-600">{formatNumber(metrics.unpaidFeesCount)}</div>
            <p className="text-sm text-muted-foreground">Pending payment</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Unpaid Amount</h3>
            </div>
            <div className="text-2xl font-bold mt-2 text-orange-600">
              {formatCurrency(metrics.unpaidFeesAmount)}
            </div>
            <p className="text-sm text-muted-foreground">Outstanding balance</p>
          </div>
        </div>
      </div>

      {/* Deadline Warnings */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Deadline Warnings</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`rounded-lg border p-4 ${metrics.dueSoonCount > 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Due Soon</h3>
              </div>
              {metrics.dueSoonCount > 0 && <AlertIndicator type="warning" count={metrics.dueSoonCount} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-yellow-600">{formatNumber(metrics.dueSoonCount)}</div>
            <p className="text-sm text-muted-foreground">Within 7 days</p>
          </div>
          <div className={`rounded-lg border p-4 ${metrics.overdueCount > 0 ? 'border-red-200 bg-red-50/50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold text-sm">Overdue</h3>
              </div>
              {metrics.overdueCount > 0 && <AlertIndicator type="danger" count={metrics.overdueCount} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-red-600">{formatNumber(metrics.overdueCount)}</div>
            <p className="text-sm text-muted-foreground">Requires immediate action</p>
          </div>
        </div>
      </div>

      {/* Due Soon Documents */}
      {metrics.dueSoonDocuments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Documents Due Soon</h2>
          <div className="rounded-lg border">
            <div className="divide-y">
              {metrics.dueSoonDocuments.map((doc) => (
                <Link 
                  key={doc.id} 
                  href={`/customs/${doc.documentType === 'PIB' ? 'import' : 'export'}/${doc.id}`}
                  className={`p-3 flex items-center justify-between hover:bg-accent/50 block ${doc.daysUntilDue <= 3 ? 'bg-red-50' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{doc.documentRef}</p>
                    <p className="text-sm text-muted-foreground">
                      ETA/ETD: {doc.etaEtd}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <DocumentTypeBadge type={doc.documentType} />
                    <StatusBadge status={doc.status} />
                    <span className={`text-xs font-medium ${doc.daysUntilDue <= 3 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {doc.daysUntilDue} days
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity and HS Codes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Documents</h2>
          <div className="rounded-lg border">
            {metrics.recentDocuments.length > 0 ? (
              <div className="divide-y">
                {metrics.recentDocuments.map((doc) => (
                  <Link 
                    key={doc.id} 
                    href={`/customs/${doc.documentType === 'PIB' ? 'import' : 'export'}/${doc.id}`}
                    className="p-3 flex items-center justify-between hover:bg-accent/50 block"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{doc.documentRef}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {doc.importerExporter || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <DocumentTypeBadge type={doc.documentType} />
                      <StatusBadge status={doc.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {doc.createdAt}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent documents
              </div>
            )}
          </div>
        </div>

        {/* Frequent HS Codes */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Frequent HS Codes</h2>
          <div className="rounded-lg border">
            {metrics.frequentHSCodes.length > 0 ? (
              <div className="divide-y">
                {metrics.frequentHSCodes.map((code, index) => (
                  <div 
                    key={`${code.hsCode}-${index}`}
                    className="p-3 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <p className="font-mono font-medium text-sm">{code.hsCode}</p>
                      </div>
                      <p className="text-sm text-muted-foreground truncate ml-6">
                        {code.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm font-medium text-muted-foreground">
                        {formatNumber(code.usageCount)} uses
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No HS code data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
