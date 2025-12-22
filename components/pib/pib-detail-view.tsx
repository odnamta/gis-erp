'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PIBDocumentWithRelations,
  PIBItem,
  PIBStatusHistory,
  PIBStatus,
  StatusUpdateData,
} from '@/types/pib'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PIBStatusBadge } from './pib-status-badge'
import { StatusTimeline } from './status-timeline'
import { StatusHistory } from './status-history'
import { StatusUpdateDialog } from './status-update-dialog'
import { PIBItemsTable } from './pib-items-table'
import { DutiesSummary } from './duties-summary'
import { AttachmentsSection } from '@/components/attachments/attachments-section'
import {
  formatCurrency,
  formatPIBDate,
  formatTransportMode,
  canEditPIB as canEditPIBStatus,
  canDeletePIB as canDeletePIBStatus,
  getNextAllowedStatuses,
} from '@/lib/pib-utils'
import {
  getPIBItems,
  getPIBStatusHistory,
  updatePIBStatus,
  deletePIBDocument,
} from '@/lib/pib-actions'
import { useToast } from '@/hooks/use-toast'
import {
  Pencil,
  Trash2,
  RefreshCw,
  Ship,
  Plane,
  Truck,
  FileText,
  Package,
  Calculator,
  History,
  Paperclip,
} from 'lucide-react'

interface PIBPermissions {
  canEdit: boolean
  canDelete: boolean
  canViewDuties: boolean
  canUpdateStatus: boolean
}

interface PIBDetailViewProps {
  pib: PIBDocumentWithRelations
  permissions?: PIBPermissions
}

function TransportIcon({ mode }: { mode: string | null }) {
  if (!mode) return <FileText className="h-5 w-5" />
  switch (mode) {
    case 'sea':
      return <Ship className="h-5 w-5 text-blue-500" />
    case 'air':
      return <Plane className="h-5 w-5 text-sky-500" />
    case 'land':
      return <Truck className="h-5 w-5 text-amber-500" />
    default:
      return <FileText className="h-5 w-5" />
  }
}

export function PIBDetailView({ pib, permissions }: PIBDetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<PIBItem[]>([])
  const [history, setHistory] = useState<PIBStatusHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Combine status-based and role-based permissions
  const statusAllowsEdit = canEditPIBStatus(pib.status)
  const statusAllowsDelete = canDeletePIBStatus(pib.status)
  const hasStatusTransitions = getNextAllowedStatuses(pib.status).length > 0

  // Final permission checks (role + status)
  const isEditable = statusAllowsEdit && (permissions?.canEdit ?? true)
  const isDeletable = statusAllowsDelete && (permissions?.canDelete ?? true)
  const canUpdateStatus = hasStatusTransitions && (permissions?.canUpdateStatus ?? true)
  const canViewDuties = permissions?.canViewDuties ?? true

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [itemsResult, historyResult] = await Promise.all([
        getPIBItems(pib.id),
        getPIBStatusHistory(pib.id),
      ])
      if (!itemsResult.error) setItems(itemsResult.data)
      if (!historyResult.error) setHistory(historyResult.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [pib.id])

  const handleStatusUpdate = async (newStatus: PIBStatus, data?: StatusUpdateData) => {
    const result = await updatePIBStatus(pib.id, newStatus, data)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
      throw new Error(result.error)
    }
    toast({ title: 'Success', description: 'Status updated' })
    router.refresh()
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deletePIBDocument(pib.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'PIB document deleted' })
        router.push('/customs/import')
      }
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TransportIcon mode={pib.transport_mode} />
          <div>
            <h1 className="text-2xl font-bold">{pib.internal_ref}</h1>
            {pib.pib_number && (
              <p className="text-sm text-muted-foreground">PIB: {pib.pib_number}</p>
            )}
          </div>
          <PIBStatusBadge status={pib.status} />
        </div>
        <div className="flex gap-2">
          {canUpdateStatus && (
            <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Status
            </Button>
          )}
          {isEditable && (
            <Button variant="outline" asChild>
              <Link href={`/customs/import/${pib.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {isDeletable && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="pt-6">
          <StatusTimeline currentStatus={pib.status} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items ({items.length})
          </TabsTrigger>
          {canViewDuties && (
            <TabsTrigger value="duties" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Duties
            </TabsTrigger>
          )}
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Importer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Importer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Importer Name</Label>
                <p className="font-medium">{pib.importer_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">NPWP</Label>
                <p className="font-medium">{pib.importer_npwp || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">{pib.importer_address || '-'}</p>
              </div>
              {pib.customer && (
                <div>
                  <Label className="text-muted-foreground">Linked Customer</Label>
                  <p className="font-medium">
                    <Link
                      href={`/customers/${pib.customer.id}`}
                      className="hover:underline text-primary"
                    >
                      {pib.customer.name}
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Info */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Supplier Name</Label>
                <p className="font-medium">{pib.supplier_name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Country of Origin</Label>
                <p className="font-medium">{pib.supplier_country || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Import Type</Label>
                <p className="font-medium">
                  {pib.import_type?.type_name || '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Customs Office</Label>
                <p className="font-medium">
                  {pib.customs_office
                    ? `${pib.customs_office.office_name} (${pib.customs_office.office_code})`
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Transport Details */}
          <Card>
            <CardHeader>
              <CardTitle>Transport Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-muted-foreground">Transport Mode</Label>
                <p className="font-medium">
                  {pib.transport_mode ? formatTransportMode(pib.transport_mode) : '-'}
                </p>
              </div>
              {pib.transport_mode === 'sea' && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Vessel Name</Label>
                    <p className="font-medium">{pib.vessel_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Voyage Number</Label>
                    <p className="font-medium">{pib.voyage_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bill of Lading</Label>
                    <p className="font-medium">{pib.bill_of_lading || '-'}</p>
                  </div>
                </>
              )}
              {pib.transport_mode === 'air' && (
                <div>
                  <Label className="text-muted-foreground">AWB Number</Label>
                  <p className="font-medium">{pib.awb_number || '-'}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Port of Loading</Label>
                <p className="font-medium">{pib.port_of_loading || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Port of Discharge</Label>
                <p className="font-medium">{pib.port_of_discharge || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ETA</Label>
                <p className="font-medium">{formatPIBDate(pib.eta_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ATA</Label>
                <p className="font-medium">{formatPIBDate(pib.ata_date)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Cargo Details */}
          <Card>
            <CardHeader>
              <CardTitle>Cargo Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground">Total Packages</Label>
                <p className="font-medium">
                  {pib.total_packages
                    ? `${pib.total_packages} ${pib.package_type || ''}`
                    : '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Gross Weight</Label>
                <p className="font-medium">
                  {pib.gross_weight_kg
                    ? `${pib.gross_weight_kg.toLocaleString('id-ID')} kg`
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Linked Job Order */}
          {pib.job_order && (
            <Card>
              <CardHeader>
                <CardTitle>Linked Job Order</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/job-orders/${pib.job_order.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {pib.job_order.jo_number}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {pib.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{pib.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Key Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="font-medium">{formatPIBDate(pib.created_at)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="font-medium">{formatPIBDate(pib.submitted_at)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Duties Paid</Label>
                <p className="font-medium">{formatPIBDate(pib.duties_paid_at)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Released</Label>
                <p className="font-medium">{formatPIBDate(pib.released_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* SPPB Info */}
          {(pib.sppb_number || pib.sppb_date) && (
            <Card>
              <CardHeader>
                <CardTitle>SPPB Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">SPPB Number</Label>
                  <p className="font-medium">{pib.sppb_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">SPPB Date</Label>
                  <p className="font-medium">{formatPIBDate(pib.sppb_date)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <PIBItemsTable
            pibId={pib.id}
            items={items}
            currency={pib.currency}
            editable={isEditable}
            onRefresh={loadData}
          />
        </TabsContent>

        {/* Duties Tab */}
        {canViewDuties && (
          <TabsContent value="duties">
            <DutiesSummary
              fobValue={pib.fob_value || 0}
              freightValue={pib.freight_value || 0}
              insuranceValue={pib.insurance_value || 0}
              cifValue={pib.cif_value || 0}
              exchangeRate={pib.exchange_rate}
              cifValueIdr={pib.cif_value_idr}
              beaMasuk={pib.bea_masuk}
              ppn={pib.ppn}
              pphImport={pib.pph_import}
              totalDuties={pib.total_duties}
              currency={pib.currency}
            />
          </TabsContent>
        )}

        {/* History Tab */}
        <TabsContent value="history">
          <StatusHistory history={history} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <AttachmentsSection
            entityType="pib"
            entityId={pib.id}
            title="PIB Documents"
            maxFiles={20}
          />
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <StatusUpdateDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        currentStatus={pib.status}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PIB Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {pib.internal_ref}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
