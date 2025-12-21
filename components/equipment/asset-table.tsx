'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, Pencil } from 'lucide-react'
import { AssetWithRelations } from '@/types/assets'
import { AssetStatusBadge } from './asset-status-badge'

interface AssetTableProps {
  assets: AssetWithRelations[]
  canEdit?: boolean
}

export function AssetTable({ assets, canEdit = false }: AssetTableProps) {
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No assets found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or add a new asset
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Registration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-mono text-sm">
                {asset.asset_code}
              </TableCell>
              <TableCell className="font-medium">{asset.asset_name}</TableCell>
              <TableCell>
                {asset.category?.category_name || '-'}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {asset.registration_number || '-'}
              </TableCell>
              <TableCell>
                <AssetStatusBadge status={asset.status} />
              </TableCell>
              <TableCell>
                {asset.location?.location_name || '-'}
              </TableCell>
              <TableCell>
                {asset.assigned_job?.jo_number || 
                 asset.assigned_employee?.full_name || 
                 '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/equipment/${asset.id}`}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Link>
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/equipment/${asset.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
