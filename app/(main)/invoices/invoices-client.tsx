'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InvoiceVirtualTable } from '@/components/invoices/invoice-virtual-table'
import { InvoiceFilters } from '@/components/invoices/invoice-filters'
import { InvoiceWithRelations, InvoiceStatus } from '@/types'
import { getInvoices, InvoiceStats } from './actions'
import { formatCurrency } from '@/lib/utils/format'
import { Loader2, FileText, Clock, AlertTriangle, CheckCircle, ShieldAlert, TrendingDown, Copy, FileWarning } from 'lucide-react'
import type { RedFlagSummary, InvoiceRedFlag, RedFlagType } from '@/lib/invoice-red-flags'
import { getRedFlagSummary } from '@/lib/invoice-red-flags'
import Link from 'next/link'

interface InvoicesClientProps {
  serverStats?: InvoiceStats
}

const RED_FLAG_LABELS: Record<RedFlagType, { label: string; color: string; icon: typeof ShieldAlert }> = {
  overdue: { label: 'Overdue', color: 'text-red-600', icon: AlertTriangle },
  negative_margin: { label: 'Margin Negatif', color: 'text-orange-600', icon: TrendingDown },
  duplicate_suspect: { label: 'Duplikat', color: 'text-yellow-600', icon: Copy },
  missing_invoice: { label: 'Belum Ada Invoice', color: 'text-purple-600', icon: FileWarning },
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
}

export function InvoicesClient({ serverStats }: InvoicesClientProps) {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [redFlags, setRedFlags] = useState<RedFlagSummary | null>(null)
  const [redFlagsLoading, setRedFlagsLoading] = useState(true)
  const [showRedFlags, setShowRedFlags] = useState(false)
  const [activeRedFlagFilter, setActiveRedFlagFilter] = useState<RedFlagType | null>(null)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const filters = {
        status: status === 'all' ? undefined : status,
        search: search || undefined,
      }
      const data = await getInvoices(filters)
      setInvoices(data)
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadInvoices()
    }, 300)
    return () => clearTimeout(debounce)
  }, [loadInvoices])

  // Load red flags on mount
  useEffect(() => {
    async function loadRedFlags() {
      setRedFlagsLoading(true)
      try {
        const summary = await getRedFlagSummary()
        setRedFlags(summary)
      } finally {
        setRedFlagsLoading(false)
      }
    }
    loadRedFlags()
  }, [])

  // Filter displayed flags by type
  const displayedFlags = redFlags
    ? activeRedFlagFilter
      ? redFlags.flags.filter(f => f.type === activeRedFlagFilter)
      : redFlags.flags
    : []

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {serverStats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Invoice</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{formatCurrency(serverStats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">{serverStats.totalCount} invoice</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-yellow-600">{serverStats.outstandingCount}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(serverStats.outstandingAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-red-600">{serverStats.overdueCount}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(serverStats.overdueAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Lunas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-600">{serverStats.paidCount}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(serverStats.paidAmount)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Red Flag Summary Banner */}
      {!redFlagsLoading && redFlags && redFlags.totalFlags > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base text-red-800">
                  Red Flags ({redFlags.totalFlags})
                </CardTitle>
              </div>
              <button
                onClick={() => setShowRedFlags(!showRedFlags)}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                {showRedFlags ? 'Sembunyikan' : 'Tampilkan Detail'}
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Flag Type Summary Pills */}
            <div className="flex flex-wrap gap-2">
              {redFlags.overdueCount > 0 && (
                <button
                  onClick={() => {
                    setShowRedFlags(true)
                    setActiveRedFlagFilter(activeRedFlagFilter === 'overdue' ? null : 'overdue')
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeRedFlagFilter === 'overdue' ? 'bg-red-200 border-red-400' : 'bg-red-100 border-red-200 hover:bg-red-200'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {redFlags.overdueCount} Overdue
                </button>
              )}
              {redFlags.negativeMarginCount > 0 && (
                <button
                  onClick={() => {
                    setShowRedFlags(true)
                    setActiveRedFlagFilter(activeRedFlagFilter === 'negative_margin' ? null : 'negative_margin')
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeRedFlagFilter === 'negative_margin' ? 'bg-orange-200 border-orange-400' : 'bg-orange-100 border-orange-200 hover:bg-orange-200'
                  }`}
                >
                  <TrendingDown className="h-3 w-3" />
                  {redFlags.negativeMarginCount} Margin Negatif
                </button>
              )}
              {redFlags.duplicateSuspectCount > 0 && (
                <button
                  onClick={() => {
                    setShowRedFlags(true)
                    setActiveRedFlagFilter(activeRedFlagFilter === 'duplicate_suspect' ? null : 'duplicate_suspect')
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeRedFlagFilter === 'duplicate_suspect' ? 'bg-yellow-200 border-yellow-400' : 'bg-yellow-100 border-yellow-200 hover:bg-yellow-200'
                  }`}
                >
                  <Copy className="h-3 w-3" />
                  {redFlags.duplicateSuspectCount} Duplikat
                </button>
              )}
              {redFlags.missingInvoiceCount > 0 && (
                <button
                  onClick={() => {
                    setShowRedFlags(true)
                    setActiveRedFlagFilter(activeRedFlagFilter === 'missing_invoice' ? null : 'missing_invoice')
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeRedFlagFilter === 'missing_invoice' ? 'bg-purple-200 border-purple-400' : 'bg-purple-100 border-purple-200 hover:bg-purple-200'
                  }`}
                >
                  <FileWarning className="h-3 w-3" />
                  {redFlags.missingInvoiceCount} Belum Diinvoice
                </button>
              )}
            </div>

            {/* Expanded Flag Details */}
            {showRedFlags && (
              <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
                {displayedFlags.map((flag) => (
                  <RedFlagItem key={flag.id} flag={flag} />
                ))}
                {displayedFlags.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">Tidak ada flag untuk filter ini</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>View and manage all invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InvoiceFilters
            status={status}
            search={search}
            onStatusChange={setStatus}
            onSearchChange={setSearch}
          />
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <InvoiceVirtualTable invoices={invoices} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RedFlagItem({ flag }: { flag: InvoiceRedFlag }) {
  const config = RED_FLAG_LABELS[flag.type]
  const Icon = config.icon
  const severityClass = SEVERITY_COLORS[flag.severity] || SEVERITY_COLORS.medium
  const severityLabel = SEVERITY_LABELS[flag.severity] || flag.severity

  const linkHref = flag.invoiceId
    ? `/invoices/${flag.invoiceId}`
    : flag.joId
      ? `/job-orders/${flag.joId}`
      : '#'

  return (
    <Link
      href={linkHref}
      className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{flag.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${severityClass}`}>
            {severityLabel}
          </span>
          <span className="text-[10px] text-muted-foreground">{config.label}</span>
        </div>
      </div>
      {flag.amount !== undefined && flag.amount !== 0 && (
        <span className="text-sm font-medium text-gray-700 shrink-0">
          {formatCurrency(Math.abs(flag.amount))}
        </span>
      )}
    </Link>
  )
}
