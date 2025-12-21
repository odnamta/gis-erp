'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Loader2, RefreshCw, Plus, FileText, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AssetDetailView,
  AssetStatusDialog,
  AssetDocumentList,
  AssetDocumentForm,
  AssetPhotoGallery,
} from '@/components/equipment'
import {
  AssetWithRelations,
  AssetStatusHistory,
  AssetDocument,
  AssetLocation,
  AssetDocumentFormData,
} from '@/types/assets'
import {
  getAssetById,
  getAssetStatusHistory,
  getAssetDocuments,
  createAssetDocument,
  deleteAssetDocument,
  getAssetLocations,
} from '@/lib/asset-actions'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/components/providers/permission-provider'

export default function AssetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { canAccess } = usePermissions()

  const [asset, setAsset] = useState<AssetWithRelations | null>(null)
  const [statusHistory, setStatusHistory] = useState<AssetStatusHistory[]>([])
  const [documents, setDocuments] = useState<AssetDocument[]>([])
  const [locations, setLocations] = useState<AssetLocation[]>([])
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
      const [assetResult, historyResult, docsResult, locationsResult] = await Promise.all([
        getAssetById(assetId),
        getAssetStatusHistory(assetId),
        getAssetDocuments(assetId),
        getAssetLocations(),
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
