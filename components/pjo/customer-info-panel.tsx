'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Mail, Phone, MapPin, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { getCustomerDetailsForPJO } from '@/app/(main)/proforma-jo/actions'
import type { CustomerDetailsForPJO, PJOHistoryItem } from '@/app/(main)/proforma-jo/actions'
import { cn } from '@/lib/utils'

interface CustomerInfoPanelProps {
  customerId: string | null
}

export function CustomerInfoPanel({ customerId }: CustomerInfoPanelProps) {
  const [customer, setCustomer] = useState<CustomerDetailsForPJO | null>(null)
  const [recentPJOs, setRecentPJOs] = useState<PJOHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!customerId) {
      setCustomer(null)
      setRecentPJOs([])
      return
    }

    setIsLoading(true)
    getCustomerDetailsForPJO(customerId)
      .then(({ customer, recentPJOs }) => {
        setCustomer(customer)
        setRecentPJOs(recentPJOs)
      })
      .finally(() => setIsLoading(false))
  }, [customerId])

  if (!customerId || isLoading) return null
  if (!customer) return null

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <Building2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-blue-900">{customer.name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-blue-700">
              {customer.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {customer.address}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </span>
              )}
            </div>

            {recentPJOs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-xs font-medium text-blue-800 flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  Riwayat PJO Terakhir
                </p>
                <div className="space-y-1">
                  {recentPJOs.map((pjo) => (
                    <div key={pjo.id} className="flex items-center gap-2 text-xs text-blue-700">
                      <span className="font-mono">{pjo.pjo_number}</span>
                      <span className="text-blue-500">—</span>
                      <span className="truncate">{pjo.commodity || pjo.pol || '-'}</span>
                      <span className={cn('ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium', statusColors[pjo.status] || 'bg-gray-100 text-gray-700')}>
                        {pjo.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
