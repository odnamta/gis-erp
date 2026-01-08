'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Truck,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { VendorWithStats } from '@/types/vendors'
import { getVendorTypeLabel, formatRating } from '@/lib/vendor-utils'
import { VirtualDataTable, VirtualColumn } from '@/components/tables/virtual-data-table'

interface VendorVirtualTableProps {
  vendors: VendorWithStats[]
  canEdit?: boolean
  canRate?: boolean
  onRate?: (vendorId: string) => void
}

function getStatusBadge(vendor: VendorWithStats) {
  if (!vendor.is_active) {
    return (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3 w-3" />
        Inactive
      </Badge>
    )
  }

  if (!vendor.is_verified) {
    return (
      <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
        <AlertCircle className="h-3 w-3" />
        Unverified
      </Badge>
    )
  }

  if (vendor.is_preferred) {
    return (
      <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600">
        <Star className="h-3 w-3" />
        Preferred
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
      <CheckCircle className="h-3 w-3" />
      Active
    </Badge>
  )
}

export function VendorVirtualTable({
  vendors,
  canEdit,
  canRate,
  onRate,
}: VendorVirtualTableProps) {
  const router = useRouter()

  const handleView = (id: string) => router.push(`/vendors/${id}`)
  const handleEdit = (id: string) => router.push(`/vendors/${id}/edit`)
  const handleEquipment = (id: string) => router.push(`/vendors/${id}#equipment`)

  const columns: VirtualColumn<VendorWithStats>[] = [
    {
      key: 'vendor_code',
      header: 'Code',
      width: '100px',
      className: 'font-mono text-sm',
      render: (vendor) => vendor.vendor_code,
    },
    {
      key: 'vendor_name',
      header: 'Vendor Name',
      render: (vendor) => (
        <div>
          <div className="font-medium">{vendor.vendor_name}</div>
          {vendor.equipment_count && vendor.equipment_count > 0 && (
            <div className="text-xs text-muted-foreground">
              {vendor.equipment_count} equipment
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'vendor_type',
      header: 'Type',
      width: '120px',
      render: (vendor) => (
        <Badge variant="outline">{getVendorTypeLabel(vendor.vendor_type)}</Badge>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (vendor) =>
        vendor.contact_person ? (
          <div>
            <div className="text-sm">{vendor.contact_person}</div>
            {vendor.contact_phone && (
              <div className="text-xs text-muted-foreground">{vendor.contact_phone}</div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'total_jobs',
      header: 'Jobs',
      headerClassName: 'text-center',
      className: 'text-center',
      width: '70px',
      render: (vendor) => (vendor.total_jobs > 0 ? vendor.total_jobs : '-'),
    },
    {
      key: 'average_rating',
      header: 'Rating',
      headerClassName: 'text-center',
      className: 'text-center',
      width: '80px',
      render: (vendor) =>
        vendor.average_rating ? (
          <div className="flex items-center justify-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{formatRating(vendor.average_rating)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (vendor) => getStatusBadge(vendor),
    },
    {
      key: 'actions',
      header: '',
      width: '70px',
      render: (vendor) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(vendor.id)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => handleEdit(vendor.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleEquipment(vendor.id)}>
              <Truck className="mr-2 h-4 w-4" />
              Equipment
            </DropdownMenuItem>
            {canRate && onRate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onRate(vendor.id)}>
                  <Star className="mr-2 h-4 w-4" />
                  Rate Vendor
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <VirtualDataTable
      columns={columns}
      data={vendors}
      getRowKey={(vendor) => vendor.id}
      onRowClick={(vendor) => handleView(vendor.id)}
      emptyMessage="No vendors found. Try adjusting your filters or add a new vendor."
      maxHeight={600}
    />
  )
}
