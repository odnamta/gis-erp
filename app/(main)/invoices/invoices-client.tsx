'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InvoiceTable } from '@/components/invoices/invoice-table'
import { InvoiceFilters } from '@/components/invoices/invoice-filters'
import { InvoiceWithRelations, InvoiceStatus } from '@/types'
import { getInvoices } from './actions'
import { Loader2 } from 'lucide-react'

export function InvoicesClient() {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all')
  const [search, setSearch] = useState('')

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

  return (
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
          <InvoiceTable invoices={invoices} />
        )}
      </CardContent>
    </Card>
  )
}
