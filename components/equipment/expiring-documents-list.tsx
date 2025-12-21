'use client'

import { useRouter } from 'next/navigation'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock, FileText, ExternalLink } from 'lucide-react'
import { ExpiringDocument } from '@/types/assets'
import { getAssetDocumentTypeLabel, formatAssetDate } from '@/lib/asset-utils'

interface ExpiringDocumentsListProps {
  documents: ExpiringDocument[]
  title?: string
  showAssetLink?: boolean
}

export function ExpiringDocumentsList({
  documents,
  title = 'Expiring Documents',
  showAssetLink = true,
}: ExpiringDocumentsListProps) {
  const router = useRouter()

  const getStatusBadge = (status: string, daysUntilExpiry: number) => {
    if (status === 'expired') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600">
        <Clock className="h-3 w-3" />
        {daysUntilExpiry} days
      </Badge>
    )
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No expiring documents</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group by status
  const expired = documents.filter((d) => d.status === 'expired')
  const expiringSoon = documents.filter((d) => d.status === 'expiring_soon')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
          <Badge variant="secondary" className="ml-2">
            {documents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expired.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Expired ({expired.length})
            </h4>
            <DocumentTable
              documents={expired}
              showAssetLink={showAssetLink}
              onAssetClick={(id) => router.push(`/equipment/${id}`)}
              getStatusBadge={getStatusBadge}
            />
          </div>
        )}

        {expiringSoon.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Expiring Soon ({expiringSoon.length})
            </h4>
            <DocumentTable
              documents={expiringSoon}
              showAssetLink={showAssetLink}
              onAssetClick={(id) => router.push(`/equipment/${id}`)}
              getStatusBadge={getStatusBadge}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface DocumentTableProps {
  documents: ExpiringDocument[]
  showAssetLink: boolean
  onAssetClick: (assetId: string) => void
  getStatusBadge: (status: string, daysUntilExpiry: number) => React.ReactNode
}

function DocumentTable({
  documents,
  showAssetLink,
  onAssetClick,
  getStatusBadge,
}: DocumentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showAssetLink && <TableHead>Asset</TableHead>}
          <TableHead>Document</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Expiry Date</TableHead>
          <TableHead>Status</TableHead>
          {showAssetLink && <TableHead className="w-[80px]"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            {showAssetLink && (
              <TableCell>
                <div>
                  <p className="font-medium font-mono text-sm">{doc.asset_code}</p>
                  <p className="text-xs text-muted-foreground">{doc.asset_name}</p>
                  {doc.registration_number && (
                    <p className="text-xs text-muted-foreground">{doc.registration_number}</p>
                  )}
                </div>
              </TableCell>
            )}
            <TableCell className="font-medium">{doc.document_name}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {getAssetDocumentTypeLabel(doc.document_type)}
              </Badge>
            </TableCell>
            <TableCell>{formatAssetDate(doc.expiry_date)}</TableCell>
            <TableCell>{getStatusBadge(doc.status, doc.days_until_expiry)}</TableCell>
            {showAssetLink && (
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAssetClick(doc.asset_id)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
