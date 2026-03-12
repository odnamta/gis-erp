'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PEBDocumentWithRelations,
  PEBItem,
  PEBStatusHistory,
  PEBStatus,
  PEBStatusUpdateData,
} from '@/types/peb'
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
import { PEBStatusBadge } from './peb-status-badge'
import { StatusTimeline } from './status-timeline'
import { StatusHistory } from './status-history'
import { StatusUpdateDialog } from './status-update-dialog'
import { PEBItemsTable } from './peb-items-table'
import { AttachmentsSection } from '@/components/attachments/attachments-section'
import { DocumentFeesSection } from '@/components/customs-fees/document-fees-section'
import { formatCurrency, getNextAllowedStatuses } from '@/lib/peb-utils'
import {
  getPEBItems,
  getPEBStatusHistory,
  updatePEBStatus,
  deletePEBDocument,
} from '@/lib/peb-actions'
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
  History,
  Paperclip,
  Receipt,
} from 'lucide-react'
import { format } from 'date-fns'

interface PEBPermissions {
  canEdit: boolean
  canDelete: boolean
  canUpdateStatus: boolean
}

interface PEBDetailViewProps {
  peb: PEBDocumentWithRelations
  permissions?: PEBPermissions
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'dd/MM/yyyy')
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

export function PEBDetailView({ peb, permissions }: PEBDetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<PEBItem[]>([])
  const [history, setHistory] = useState<PEBStatusHistory[]>([])
  const [_isLoading, setIsLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Permission checks
  const statusAllowsEdit = peb.status === 'draft'
  const statusAllowsDelete = peb.status === 'draft'
  const hasStatusTransitions = getNextAllowedStatuses(peb.status).length > 0

  const isEditable = statusAllowsEdit && (permissions?.canEdit ?? true)
  const isDeletable = statusAllowsDelete && (permissions?.canDelete ?? true)
  const canUpdateStatus = hasStatusTransitions && (permissions?.canUpdateStatus ?? true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [itemsResult, historyResult] = await Promise.all([
        getPEBItems(peb.id),
        getPEBStatusHistory(peb.id),
      ])
      if (!itemsResult.error) setItems(itemsResult.data)
      if (!historyResult.error) setHistory(historyResult.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [peb.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusUpdate = async (newStatus: PEBStatus, data?: PEBStatusUpdateData) => {
    const result = await updatePEBStatus(peb.id, newStatus, data)
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
      const result = await deletePEBDocument(peb.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'PEB document deleted' })
        router.push('/customs/export')
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
          <TransportIcon mode={peb.transport_mode} />
          <div>
            <h1 className="text-2xl font-bold">{peb.internal_ref}</h1>
            {peb.peb_number && (
              <p className="text-sm text-muted-foreground">PEB: {peb.peb_number}</p>
            )}
          </div>
          <PEBStatusBadge status={peb.status} />
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
              <Link href={`/customs/export/${peb.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {isDeletable && (
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="pt-6">
          <StatusTimeline currentStatus={peb.status} />
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
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Fees
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Exporter Info */}
          <Card>
            <CardHeader>
              <CardTitle>Exporter Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Exporter Name</Label>
                <p className="font-medium">{peb.exporter_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">NPWP</Label>
                <p className="font-medium">{peb.exporter_npwp || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">{peb.exporter_address || '-'}</p>
              </div>
              {peb.customer && (
                <div>
                  <Label className="text-muted-foreground">Linked Customer</Label>
                  <p className="font-medium">
                    <Link href={`/customers/${peb.customer.id}`} className="hover:underline text-primary">
                      {peb.customer.name}
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consignee Info */}
          <Card>
            <CardHeader>
              <CardTitle>Consignee Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Consignee Name</Label>
                <p className="font-medium">{peb.consignee_name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Country</Label>
                <p className="font-medium">{peb.consignee_country || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">{peb.consignee_address || '-'}</p>
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
                <Label className="text-muted-foreground">Export Type</Label>
                <p className="font-medium">{peb.export_type?.type_name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Customs Office</Label>
                <p className="font-medium">
                  {peb.customs_office
                    ? `${peb.customs_office.office_name} (${peb.customs_office.office_code})`
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
                <p className="font-medium capitalize">{peb.transport_mode || '-'}</p>
              </div>
              {peb.transport_mode === 'sea' && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Vessel Name</Label>
                    <p className="font-medium">{peb.vessel_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Voyage Number</Label>
                    <p className="font-medium">{peb.voyage_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bill of Lading</Label>
                    <p className="font-medium">{peb.bill_of_lading || '-'}</p>
                  </div>
                </>
              )}
              {peb.transport_mode === 'air' && (
                <div>
                  <Label className="text-muted-foreground">AWB Number</Label>
                  <p className="font-medium">{peb.awb_number || '-'}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Port of Loading</Label>
                <p className="font-medium">{peb.port_of_loading || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Port of Discharge</Label>
                <p className="font-medium">{peb.port_of_discharge || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Final Destination</Label>
                <p className="font-medium">{peb.final_destination || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ETD</Label>
                <p className="font-medium">{formatDate(peb.etd_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ATD</Label>
                <p className="font-medium">{formatDate(peb.atd_date)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Cargo & Value */}
          <Card>
            <CardHeader>
              <CardTitle>Cargo & Value</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-muted-foreground">Total Packages</Label>
                <p className="font-medium">
                  {peb.total_packages ? `${peb.total_packages} ${peb.package_type || ''}` : '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Gross Weight</Label>
                <p className="font-medium">
                  {peb.gross_weight_kg ? `${peb.gross_weight_kg.toLocaleString('id-ID')} kg` : '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">FOB Value</Label>
                <p className="font-medium">{formatCurrency(peb.fob_value || 0, peb.currency)}</p>
              </div>
            </CardContent>
          </Card>

          {/* NPE Info */}
          {(peb.npe_number || peb.npe_date) && (
            <Card>
              <CardHeader>
                <CardTitle>NPE Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">NPE Number</Label>
                  <p className="font-medium">{peb.npe_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">NPE Date</Label>
                  <p className="font-medium">{formatDate(peb.npe_date)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Job Order */}
          {peb.job_order && (
            <Card>
              <CardHeader>
                <CardTitle>Linked Job Order</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/job-orders/${peb.job_order.id}`} className="text-primary hover:underline font-medium">
                  {peb.job_order.jo_number}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {peb.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{peb.notes}</p>
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
                <p className="font-medium">{formatDate(peb.created_at)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="font-medium">{formatDate(peb.submitted_at)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Approved</Label>
                <p className="font-medium">{formatDate(peb.approved_at)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Loaded</Label>
                <p className="font-medium">{formatDate(peb.loaded_at)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <PEBItemsTable
            pebId={peb.id}
            items={items}
            currency={peb.currency}
            editable={isEditable}
            onRefresh={loadData}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <AttachmentsSection entityType="peb" entityId={peb.id} title="PEB Documents" maxFiles={20} />
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees">
          <DocumentFeesSection
            documentType="peb"
            documentId={peb.id}
            editable={isEditable}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <StatusHistory history={history} />
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <StatusUpdateDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        currentStatus={peb.status}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PEB Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {peb.internal_ref}? This action cannot be undone.
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
