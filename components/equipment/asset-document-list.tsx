'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FileText, Trash2, ExternalLink, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { AssetDocument } from '@/types/assets'
import {
  getAssetDocumentTypeLabel,
  formatAssetDate,
  getDocumentExpiryStatus,
  calculateDaysUntilExpiry,
} from '@/lib/asset-utils'

interface AssetDocumentListProps {
  documents: AssetDocument[]
  canDelete?: boolean
  onDelete?: (documentId: string) => Promise<void>
}

export function AssetDocumentList({
  documents,
  canDelete = false,
  onDelete,
}: AssetDocumentListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(deleteId)
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const getExpiryBadge = (expiryDate: string | null, reminderDays: number) => {
    const status = getDocumentExpiryStatus(expiryDate, reminderDays)
    
    switch (status) {
      case 'expired':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expired
          </Badge>
        )
      case 'expiring_soon':
        const days = calculateDaysUntilExpiry(expiryDate!)
        return (
          <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600">
            <Clock className="h-3 w-3" />
            {days} days
          </Badge>
        )
      case 'valid':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
            <CheckCircle className="h-3 w-3" />
            Valid
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">No expiry</Badge>
        )
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No documents uploaded</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{doc.document_name}</span>
                </div>
                {doc.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getAssetDocumentTypeLabel(doc.document_type)}
                </Badge>
              </TableCell>
              <TableCell>
                {doc.issue_date ? formatAssetDate(doc.issue_date) : '-'}
              </TableCell>
              <TableCell>
                {doc.expiry_date ? formatAssetDate(doc.expiry_date) : '-'}
              </TableCell>
              <TableCell>
                {getExpiryBadge(doc.expiry_date, doc.reminder_days)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {doc.document_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {canDelete && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
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
    </>
  )
}
