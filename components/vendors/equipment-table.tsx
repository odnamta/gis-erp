'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { VendorEquipment } from '@/types/vendors';
import {
  getEquipmentTypeLabel,
  formatVendorCurrency,
  getDocumentExpiryStatus,
} from '@/lib/vendor-utils';

interface EquipmentTableProps {
  equipment: VendorEquipment[];
  canEdit: boolean;
  onEdit?: (equipment: VendorEquipment) => void;
  onDelete?: (equipmentId: string) => void;
}

export function EquipmentTable({
  equipment,
  canEdit,
  onEdit,
  onDelete,
}: EquipmentTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<VendorEquipment | null>(null);

  const handleDeleteClick = (eq: VendorEquipment) => {
    setEquipmentToDelete(eq);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (equipmentToDelete && onDelete) {
      onDelete(equipmentToDelete.id);
    }
    setDeleteDialogOpen(false);
    setEquipmentToDelete(null);
  };

  const getExpiryBadge = (expiryDate: string | null | undefined, label: string) => {
    const status = getDocumentExpiryStatus(expiryDate);
    if (status === 'no_expiry') return null;

    if (status === 'expired') {
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          {label} Expired
        </Badge>
      );
    }

    if (status === 'expiring_soon') {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {label} Expiring
        </Badge>
      );
    }

    return null;
  };

  if (equipment.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No equipment registered for this vendor
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Plate Number</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Daily Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Documents</TableHead>
              {canEdit && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((eq) => (
              <TableRow key={eq.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{getEquipmentTypeLabel(eq.equipment_type)}</p>
                    {eq.brand && (
                      <p className="text-sm text-muted-foreground">
                        {eq.brand} {eq.model}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {eq.plate_number || '-'}
                  {eq.year_made && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({eq.year_made})
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {eq.capacity_description ||
                    (eq.capacity_kg
                      ? `${eq.capacity_kg.toLocaleString()} kg`
                      : eq.capacity_m3
                      ? `${eq.capacity_m3} m³`
                      : '-')}
                </TableCell>
                <TableCell className="text-right">
                  {formatVendorCurrency(eq.daily_rate)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant={eq.is_available ? 'default' : 'secondary'}
                      className="w-fit"
                    >
                      {eq.is_available ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Available
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Unavailable
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline" className="w-fit text-xs capitalize">
                      {eq.condition}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {getExpiryBadge(eq.stnk_expiry, 'STNK')}
                    {getExpiryBadge(eq.kir_expiry, 'KIR')}
                    {getExpiryBadge(eq.insurance_expiry, 'Insurance')}
                    {!getExpiryBadge(eq.stnk_expiry, '') &&
                      !getExpiryBadge(eq.kir_expiry, '') &&
                      !getExpiryBadge(eq.insurance_expiry, '') && (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                  </div>
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(eq)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(eq)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this equipment
              {equipmentToDelete?.plate_number && ` (${equipmentToDelete.plate_number})`}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
