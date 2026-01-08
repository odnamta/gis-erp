'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Eye, Pencil } from 'lucide-react'
import { AssetWithRelations } from '@/types/assets'
import { AssetStatusBadge } from './asset-status-badge'
import { VirtualDataTable, VirtualColumn } from '@/components/tables/virtual-data-table'

interface AssetVirtualTableProps {
  assets: AssetWithRelations[]
  canEdit?: boolean
}

export function AssetVirtualTable({ assets, canEdit = false }: AssetVirtualTableProps) {
  const router = useRouter()

  const columns: VirtualColumn<AssetWithRelations>[] = [
    {
      key: 'asset_code',
      header: 'Code',
      width: '100px',
      className: 'font-mono text-sm',
      render: (asset) => asset.asset_code,
    },
    {
      key: 'asset_name',
      header: 'Name',
      className: 'font-medium',
      render: (asset) => asset.asset_name,
    },
    {
      key: 'category',
      header: 'Category',
      width: '140px',
      render: (asset) => asset.category?.category_name || '-',
    },
    {
      key: 'registration_number',
      header: 'Registration',
      width: '130px',
      className: 'font-mono text-sm',
      render: (asset) => asset.registration_number || '-',
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (asset) => <AssetStatusBadge status={asset.status} />,
    },
    {
      key: 'location',
      header: 'Location',
      width: '140px',
      render: (asset) => asset.location?.location_name || '-',
    },
    {
      key: 'assigned',
      header: 'Assigned To',
      render: (asset) =>
        asset.assigned_job?.jo_number || asset.assigned_employee?.full_name || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      width: '100px',
      render: (asset) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/equipment/${asset.id}`)
            }}
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">View</span>
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/equipment/${asset.id}/edit`)
              }}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <VirtualDataTable
      columns={columns}
      data={assets}
      getRowKey={(asset) => asset.id}
      onRowClick={(asset) => router.push(`/equipment/${asset.id}`)}
      emptyMessage="No assets found. Try adjusting your filters or add a new asset."
      maxHeight={600}
    />
  )
}
