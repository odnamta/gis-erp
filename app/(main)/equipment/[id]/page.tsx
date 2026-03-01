'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Loader2, RefreshCw, Plus, FileText, ImageIcon, Wrench, Eye, ClipboardList, Link2, Calculator, TrendingDown, DollarSign, Fuel, Shield, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  AssetPhotoUpload,
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
import { getAssetTCOSummary, recordCost, refreshTCOView } from '@/lib/depreciation-actions'
import { AssetTCOSummary, CostType } from '@/types/depreciation'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/components/providers/permission-provider'
import { formatDate, formatIDR } from '@/lib/pjo-utils'
import { formatCurrency, formatCurrencyShort } from '@/lib/utils/format'

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
  const [tcoSummary, setTcoSummary] = useState<AssetTCOSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [documentFormOpen, setDocumentFormOpen] = useState(false)
  const [costDialogOpen, setCostDialogOpen] = useState(false)
  const [costSubmitting, setCostSubmitting] = useState(false)
  const [costForm, setCostForm] = useState({
    cost_type: '' as CostType | '',
    cost_date: new Date().toISOString().split('T')[0],
    amount: '',
    notes: '',
  })

  const assetId = params.id as string
  const canEdit = canAccess('assets.edit')
  const canChangeStatus = canAccess('assets.change_status')
  const canUploadDocuments = canAccess('assets.upload_documents')

  const loadData = async () => {
    setIsLoading(true)

    // Use Promise.allSettled to prevent one failing request from blocking all data
    const results = await Promise.allSettled([
      getAssetById(assetId),
      getAssetStatusHistory(assetId),
      getAssetDocuments(assetId),
      getAssetLocations(),
      getMaintenanceHistory({ assetId } as MaintenanceHistoryFilters),
      getAssetTCOSummary(assetId),
    ])

    const [assetResult, historyResult, docsResult, locationsResult, maintenanceResult, tcoResult] = results

    // Asset is the critical data — if this fails, redirect
    if (assetResult.status === 'fulfilled') {
      if (!assetResult.value) {
        toast({
          title: 'Error',
          description: 'Aset tidak ditemukan',
          variant: 'destructive',
        })
        router.push('/equipment')
        setIsLoading(false)
        return
      }
      setAsset(assetResult.value)
    } else {
      console.error('Failed to load asset:', assetResult.reason)
      toast({
        title: 'Error',
        description: 'Gagal memuat detail aset. Silakan coba lagi.',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    // Non-critical data — load what we can
    if (historyResult.status === 'fulfilled') {
      setStatusHistory(historyResult.value)
    }
    if (docsResult.status === 'fulfilled') {
      setDocuments(docsResult.value)
    }
    if (locationsResult.status === 'fulfilled') {
      setLocations(locationsResult.value)
    }
    if (maintenanceResult.status === 'fulfilled') {
      setMaintenanceHistory(maintenanceResult.value)
    }
    if (tcoResult.status === 'fulfilled' && tcoResult.value.success && tcoResult.value.data) {
      setTcoSummary(tcoResult.value.data)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [assetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddDocument = async (data: AssetDocumentFormData) => {
    const result = await createAssetDocument(assetId, data)
    if (!result.success) {
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
    if (!result.success) {
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

  const handleAddCost = async () => {
    if (!costForm.cost_type || !costForm.amount || !costForm.cost_date) {
      toast({
        title: 'Error',
        description: 'Tipe biaya, tanggal, dan jumlah wajib diisi',
        variant: 'destructive',
      })
      return
    }

    const amount = parseFloat(costForm.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Jumlah harus lebih dari 0',
        variant: 'destructive',
      })
      return
    }

    setCostSubmitting(true)
    try {
      const result = await recordCost({
        assetId,
        costType: costForm.cost_type as CostType,
        costDate: costForm.cost_date,
        amount,
        notes: costForm.notes || undefined,
      })

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Gagal menambahkan biaya',
          variant: 'destructive',
        })
        return
      }

      // Refresh TCO view and reload data
      await refreshTCOView()
      const tcoResult = await getAssetTCOSummary(assetId)
      if (tcoResult.success && tcoResult.data) {
        setTcoSummary(tcoResult.data)
      }

      toast({
        title: 'Berhasil',
        description: 'Biaya berhasil ditambahkan',
      })

      // Reset form and close dialog
      setCostForm({
        cost_type: '',
        cost_date: new Date().toISOString().split('T')[0],
        amount: '',
        notes: '',
      })
      setCostDialogOpen(false)
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal menambahkan biaya',
        variant: 'destructive',
      })
    } finally {
      setCostSubmitting(false)
    }
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photos ({(asset.photos || []).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AssetPhotoGallery photos={asset.photos || []} />
          {canEdit && (
            <AssetPhotoUpload
              assetId={assetId}
              photos={asset.photos || []}
              onSuccess={loadData}
            />
          )}
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

      {/* Cost Monitoring Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Monitoring Biaya
          </CardTitle>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCostDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Biaya
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/equipment/${assetId}/depreciation`)}
            >
              <TrendingDown className="mr-2 h-4 w-4" />
              Depresiasi
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/equipment/${assetId}/costs`)}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Riwayat Biaya
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TCO Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">Total Biaya Kepemilikan (TCO)</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(tcoSummary?.totalTCO ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Harga Beli</p>
              <p className="text-2xl font-bold">{formatCurrency(asset.purchase_price || 0)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Nilai Buku</p>
              <p className="text-2xl font-bold">{formatCurrency(asset.book_value || asset.purchase_price || 0)}</p>
            </div>
          </div>

          {/* Cost Breakdown Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">Maintenance</p>
              </div>
              <p className="text-lg font-semibold">
                {formatCurrencyShort(tcoSummary?.totalMaintenanceCost ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-muted-foreground">Depresiasi</p>
              </div>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrencyShort(tcoSummary?.totalDepreciation ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Fuel className="h-4 w-4 text-green-500" />
                <p className="text-sm text-muted-foreground">BBM</p>
              </div>
              <p className="text-lg font-semibold">
                {formatCurrencyShort(tcoSummary?.totalFuelCost ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-purple-500" />
                <p className="text-sm text-muted-foreground">Asuransi</p>
              </div>
              <p className="text-lg font-semibold">
                {formatCurrencyShort(tcoSummary?.totalInsuranceCost ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
                <p className="text-sm text-muted-foreground">Lainnya</p>
              </div>
              <p className="text-lg font-semibold">
                {formatCurrencyShort(
                  (tcoSummary?.totalRegistrationCost ?? 0) + (tcoSummary?.totalOtherCost ?? 0)
                )}
              </p>
            </div>
          </div>

          {/* Cost per KM / per Hour */}
          {tcoSummary && (tcoSummary.costPerKm || tcoSummary.costPerHour) && (
            <div className="grid gap-4 md:grid-cols-2">
              {tcoSummary.costPerKm !== undefined && tcoSummary.costPerKm > 0 && (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">Biaya per KM</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(Math.round(tcoSummary.costPerKm))}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/ km</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total {tcoSummary.totalKm?.toLocaleString('id-ID') || 0} km
                  </p>
                </div>
              )}
              {tcoSummary.costPerHour !== undefined && tcoSummary.costPerHour > 0 && (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">Biaya per Jam</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(Math.round(tcoSummary.costPerHour))}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/ jam</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total {tcoSummary.totalHours?.toLocaleString('id-ID') || 0} jam
                  </p>
                </div>
              )}
            </div>
          )}
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

      {/* Cost Entry Dialog */}
      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Biaya</DialogTitle>
            <DialogDescription>
              Catat biaya untuk aset {asset.asset_code}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cost_type">Tipe Biaya</Label>
              <Select
                value={costForm.cost_type}
                onValueChange={(value) =>
                  setCostForm((prev) => ({ ...prev, cost_type: value as CostType }))
                }
              >
                <SelectTrigger id="cost_type">
                  <SelectValue placeholder="Pilih tipe biaya" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">BBM (Bahan Bakar)</SelectItem>
                  <SelectItem value="insurance">Asuransi</SelectItem>
                  <SelectItem value="registration">Registrasi / STNK / KIR</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cost_date">Tanggal</Label>
              <Input
                id="cost_date"
                type="date"
                value={costForm.cost_date}
                onChange={(e) =>
                  setCostForm((prev) => ({ ...prev, cost_date: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Jumlah (Rp)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={costForm.amount}
                onChange={(e) =>
                  setCostForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Keterangan tambahan (opsional)"
                value={costForm.notes}
                onChange={(e) =>
                  setCostForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCostDialogOpen(false)}
              disabled={costSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleAddCost} disabled={costSubmitting}>
              {costSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
