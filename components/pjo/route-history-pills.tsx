'use client'

import { useEffect, useState } from 'react'
import { MapPin, RotateCcw } from 'lucide-react'
import { getCustomerRouteHistory, RouteHistory } from '@/lib/route-history-actions'

interface RouteHistoryPillsProps {
  customerId: string
  onSelectRoute: (route: RouteHistory) => void
}

function shortenLocation(location: string): string {
  // Take the first meaningful part of the address (city or landmark)
  const parts = location.split(',').map(p => p.trim())
  return parts[0] || location
}

export function RouteHistoryPills({ customerId, onSelectRoute }: RouteHistoryPillsProps) {
  const [routes, setRoutes] = useState<RouteHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!customerId) {
      setRoutes([])
      return
    }

    setIsLoading(true)
    getCustomerRouteHistory(customerId)
      .then(({ data }) => setRoutes(data))
      .finally(() => setIsLoading(false))
  }, [customerId])

  if (isLoading || routes.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <RotateCcw className="h-3 w-3" />
        Rute Sebelumnya — klik untuk mengisi POL & POD
      </p>
      <div className="flex flex-wrap gap-1.5">
        {routes.map((route, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectRoute(route)}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors"
            title={`${route.pol} → ${route.pod} (${route.usage_count}x)`}
          >
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="font-medium">{shortenLocation(route.pol)}</span>
            <span className="text-blue-400">→</span>
            <span className="font-medium">{shortenLocation(route.pod)}</span>
            {route.usage_count > 1 && (
              <span className="text-blue-400 text-[10px]">({route.usage_count}x)</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
