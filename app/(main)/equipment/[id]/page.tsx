'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Loader2, RefreshCw, Plus, FileText, ImageIcon, Wrench, Eye, ClipboardList, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AssetDetailView,
  AssetPhotoGallery,
  AssetDocumentList,
  AssetStatusDialog,
  AssetDocumentForm,
} from '@/components/equipment'
import {
  AssetWithRelations,
  AssetStatusHistory,
  AssetDocument,
  AssetLocation,
  AssetDocumentFormData,
} from '@/types/assets'
import { MaintenanceRecord, MaintenanceHistoryFilters } from '@/types/maintenance'
import {
  getAssetById,
  getAssetStatusHistory,
  getAssetDocuments,
  createAssetDocument,
  deleteAssetDocument,
  getAssetLocations,
} from '@/lib/asset-actions'
import { getMaintenanceHistory } from '@/lib/maintenance-actions'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/components/providers/permission-provider'
import { formatDate, formatIDR } from '@/lib/pjo-utils'

function getMaintenanceStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="border-green-500 text-green-600">Completed</Badge>
    case 'in_progress':
      return <Badge variant="outline" className="border-blue-500 text-blue-600">In Progress</Badge>
    case 'scheduled':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Scheduled</Badge>
    case 'cancelled':
      return <Badge variant="outline" className="border-gray-500 text-gray-600">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function AssetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { canAccess } = usePermissions()

  const [asset, setAsset] = useState<AssetWithRelations | null>(null)
  const [statusHistory, setStatusHistory] = useState<AssetStatusHistory[]>([])
  const [documents, setDocuments] = useState<AssetDocument[]>([])
  const [locations, setLocations] = useState<AssetLocation[]>([])
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [documentFormOpen, setDocumentFormOpen] = useState(false)

  const assetId = params.id as string
  const canEdit = canAccess('assets.edit')
  const canChangeStatus = canAccess('assets.change_status')
  const canUploadDocuments = canAccess('assets.upload_documents')

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [assetResult, historyResult, docsResult, locationsResult, maintenanceResult] = await Promise.all([
        getAssetById(assetId),
        getAssetStatusHistory(assetId),
        getAssetDocuments(assetId),
        getAssetLocations(),
        getMaintenanceHistory({ assetId } as MaintenanceHistoryFilters),
      ])

      if (!assetResult) {
        toast({
          title: 'Error',
          description: 'Asset not found',
          variant: 'destructive',
        })
        router.push('/equipment')
        return
      }

      setAsset(assetResult)
      setStatusHistory(historyResult)
      setDocuments(docsResult)
      setLocations(locationsResult)
      setMaintenanceHistory(maintenanceResult)
    } catch (error) {
      console.error('Failed to load asset:', error)
      toast({
        title: 'Error',
        description: 'Failed to load asset details',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [assetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddDocument = async (data: AssetDocumentFormData) => {
    const result = await createAssetDocument(assetId, data)
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
      return
    }
    toast({
      title: 'Success',
      description: 'Document added successfully',
    })
    // Reload documents
    const docsResult = await getAssetDocuments(assetId)
    setDocuments(docsResult)
  }

  const handleDeleteDocument = async (documentId: string) => {
    const result = await deleteAssetDocument(documentId)
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
      return
    }
    toast({
      title: 'Success',
      description: 'Document deleted successfully',
    })
    // Reload documents
    const docsResult = await getAssetDocuments(assetId)
    setDocuments(docsResult)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Asset not found</p>
        <Button variant="link" onClick={() => router.push('/equipment')}>
          Back to Equipment
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/equipment')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{asset.asset_name}</h1>
            <p className="text-muted-foreground font-mono">{asset.asset_code}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canChangeStatus && (
            <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Change Status
            </Button>
          )}

          {canEdit && (
            <Button onClick={() => router.push(`/equipment/${assetId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Asset Details */}
      <AssetDetailView asset={asset} statusHistory={statusHistory} />

      {/* Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssetPhotoGallery photos={asset.photos || []} />
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({documents.length})
          </CardTitle>
          {canUploadDocuments && (
            <Button size="sm" onClick={() => setDocumentFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <AssetDocumentList
            documents={documents}
            canDelete={canUploadDocuments}
            onDelete={handleDeleteDocument}
          />
        </CardContent>
      </Card>

      {/* Maintenance History Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance History ({maintenanceHistory.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/equipment/maintenance')}
            >
              View All
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/equipment/maintenance/new?asset_id=${assetId}`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Log Maintenance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {maintenanceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No maintenance records found for this asset.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceHistory.slice(0, 5).map((record) => (
                  <TableRow 
                    key={record.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/equipment/maintenance/${record.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{record.recordNumber}</TableCell>
                    <TableCell>{formatDate(record.maintenanceDate)}</TableCell>
                    <TableCell>{record.maintenanceType?.typeName || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(record.totalCost)}</TableCell>
                    <TableCell>{getMaintenanceStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/equipment/maintenance/${record.id}`)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Utilization Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Utilization Tracking
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/equipment/${assetId}/logs`)}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Daily Logs
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/equipment/${assetId}/assign`)}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Assign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Current Odometer</p>
              <p className="text-2xl font-bold">{asset.current_units?.toLocaleString() || 0} km</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold capitalize">{asset.status}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Current Assignment</p>
              <p className="text-2xl font-bold">{asset.assigned_to_job_id ? 'Assigned' : 'Available'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <AssetStatusDialog
        assetId={assetId}
        currentStatus={asset.status}
        locations={locations}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onSuccess={loadData}
      />

      {/* Document Form Dialog */}
      <AssetDocumentForm
        open={documentFormOpen}
        onOpenChange={setDocumentFormOpen}
        onSubmit={handleAddDocument}
      />
    </div>
  )
}
