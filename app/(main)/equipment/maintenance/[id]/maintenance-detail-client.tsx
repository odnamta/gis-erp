'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Wrench, Calendar, Gauge, MapPin, User, FileText } from 'lucide-react'
import { MaintenanceRecord, MaintenancePart } from '@/types/maintenance'
import { getMaintenanceRecordById } from '@/lib/maintenance-actions'
import { formatIDR, formatDate } from '@/lib/pjo-utils'

interface MaintenanceDetailClientProps {
  recordId: string
}

export function MaintenanceDetailClient({ recordId }: MaintenanceDetailClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecord()
  }, [recordId])

  const loadRecord = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getMaintenanceRecordById(recordId)
      if (data) {
        setRecord(data)
      } else {
        setError('Maintenance record not found')
      }
    } catch (err) {
      console.error('Failed to load maintenance record:', err)
      setError('Failed to load maintenance record')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      in_progress: 'secondary',
      scheduled: 'outline',
      cancelled: 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ')}</Badge>
  }

  const getPerformedAtLabel = (performedAt: string) => {
    const labels: Record<string, string> = {
      internal: 'Internal Workshop',
      external: 'External Workshop',
      field: 'Field Service',
    }
    return labels[performedAt] || performedAt
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>
  }

  if (error || !record) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error || 'Record not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Wrench className="h-8 w-8" />
              {record.recordNumber}
            </h1>
            <p className="text-muted-foreground">
              {record.maintenanceType?.typeName || 'Maintenance Record'}
            </p>
          </div>
        </div>
        {getStatusBadge(record.status)}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Asset Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asset Code</span>
              <span className="font-medium">{record.asset?.asset_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asset Name</span>
              <span className="font-medium">{record.asset?.asset_name}</span>
            </div>
            {record.asset?.registration_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration</span>
                <span className="font-medium">{record.asset.registration_number}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Maintenance Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{formatDate(record.maintenanceDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{record.maintenanceType?.typeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Performed At</span>
              <span className="font-medium">{getPerformedAtLabel(record.performedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Meter Readings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {record.odometerKm !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Odometer</span>
                <span className="font-medium">{record.odometerKm.toLocaleString()} km</span>
              </div>
            )}
            {record.hourMeter !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hour Meter</span>
                <span className="font-medium">{record.hourMeter.toLocaleString()} hours</span>
              </div>
            )}
            {!record.odometerKm && !record.hourMeter && (
              <p className="text-muted-foreground text-sm">No meter readings recorded</p>
            )}
          </CardContent>
        </Card>

        {record.performedAt === 'external' && (record.workshopName || record.workshopAddress) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Workshop Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {record.workshopName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{record.workshopName}</span>
                </div>
              )}
              {record.workshopAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium">{record.workshopAddress}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Work Description
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-muted-foreground">{record.description}</p>
          </div>
          {record.findings && (
            <div>
              <h4 className="font-medium mb-2">Findings</h4>
              <p className="text-muted-foreground">{record.findings}</p>
            </div>
          )}
          {record.recommendations && (
            <div>
              <h4 className="font-medium mb-2">Recommendations</h4>
              <p className="text-muted-foreground">{record.recommendations}</p>
            </div>
          )}
          {record.technicianName && (
            <div className="flex items-center gap-2 pt-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Technician:</span>
              <span className="font-medium">{record.technicianName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {record.parts && record.parts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parts Used</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.partName}</TableCell>
                    <TableCell>{part.partNumber || '-'}</TableCell>
                    <TableCell className="text-right">
                      {part.quantity} {part.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatIDR(part.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatIDR(part.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor Cost</span>
              <span>{formatIDR(record.laborCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parts Cost</span>
              <span>{formatIDR(record.partsCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">External Cost</span>
              <span>{formatIDR(record.externalCost)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Cost</span>
              <span>{formatIDR(record.totalCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {record.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{record.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
