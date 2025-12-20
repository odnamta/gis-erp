'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { QuotationWithRelations, QuotationStatus, QUOTATION_STATUS_LABELS, QUOTATION_STATUS_COLORS } from '@/types/quotation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import { calculateWinRate, calculatePipelineValue } from '@/lib/quotation-utils'
import { MarketTypeBadge } from '@/components/ui/market-type-badge'
import { MarketType } from '@/types/market-classification'
import { Search, FileText, TrendingUp, DollarSign, Target, AlertTriangle } from 'lucide-react'

interface QuotationListProps {
  quotations: QuotationWithRelations[]
  customers: { id: string; name: string }[]
  userRole?: string | null
}

export function QuotationList({ quotations, customers, userRole }: QuotationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [marketTypeFilter, setMarketTypeFilter] = useState<string>('all')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  
  // Profit margin visibility - only owner, admin, manager, finance can see
  const canViewProfitMargin = ['owner', 'admin', 'manager', 'finance', 'super_admin'].includes(userRole || '')

  // Filter quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          q.quotation_number.toLowerCase().includes(query) ||
          q.title.toLowerCase().includes(query) ||
          q.customer?.name?.toLowerCase().includes(query) ||
          q.commodity?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      
      // Status filter
      if (statusFilter !== 'all' && q.status !== statusFilter) return false
      
      // Market type filter
      if (marketTypeFilter !== 'all' && q.market_type !== marketTypeFilter) return false
      
      // Customer filter
      if (customerFilter !== 'all' && q.customer_id !== customerFilter) return false
      
      return true
    })
  }, [quotations, searchQuery, statusFilter, marketTypeFilter, customerFilter])

  // Calculate summary stats
  const stats = useMemo(() => {
    const wonCount = quotations.filter(q => q.status === 'won').length
    const lostCount = quotations.filter(q => q.status === 'lost').length
    const pipelineValue = calculatePipelineValue(quotations)
    const winRate = calculateWinRate(wonCount, lostCount)
    const pendingEngineering = quotations.filter(q => q.status === 'engineering_review').length
    
    return {
      total: quotations.length,
      draft: quotations.filter(q => q.status === 'draft').length,
      submitted: quotations.filter(q => q.status === 'submitted').length,
      won: wonCount,
      lost: lostCount,
      pipelineValue,
      winRate,
      pendingEngineering,
    }
  }, [quotations])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(stats.pipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.draft + stats.submitted} active quotations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.won} won / {stats.lost} lost
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submitted}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting client decision
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engineering Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingEngineering}</div>
            <p className="text-xs text-muted-foreground">
              Pending engineering assessment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search quotations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="engineering_review">Engineering Review</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={marketTypeFilter} onValueChange={setMarketTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Market Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="complex">Complex</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Market Type</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                {canViewProfitMargin && <TableHead className="text-right">Margin</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canViewProfitMargin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    No quotations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link 
                        href={`/quotations/${q.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {q.quotation_number}
                      </Link>
                      {q.requires_engineering && q.engineering_status !== 'completed' && q.engineering_status !== 'waived' && (
                        <AlertTriangle className="inline-block ml-1 h-4 w-4 text-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>{q.customer?.name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{q.title}</TableCell>
                    <TableCell>
                      {q.market_type && (
                        <MarketTypeBadge 
                          marketType={q.market_type as MarketType} 
                          score={q.complexity_score ?? undefined}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatIDR(q.total_revenue || 0)}</TableCell>
                    {canViewProfitMargin && (
                      <TableCell className="text-right">
                        <span className={q.profit_margin && q.profit_margin > 0 ? 'text-green-600' : 'text-red-600'}>
                          {q.profit_margin?.toFixed(1) || 0}%
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <QuotationStatusBadge status={q.status as QuotationStatus} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {q.created_at ? formatDate(q.created_at) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const label = QUOTATION_STATUS_LABELS[status] || status
  const colorClass = QUOTATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  
  return (
    <Badge variant="outline" className={colorClass}>
      {label}
    </Badge>
  )
}
