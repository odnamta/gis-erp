'use client';

// =====================================================
// v0.45: Job Equipment List Component
// =====================================================

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { MoreHorizontal, CheckCircle, Trash2, Edit } from 'lucide-react';
import { JobEquipmentUsage } from '@/types/job-equipment';
import {
  formatEquipmentCurrency,
  calculateUsageDays,
  getRateTypeLabel,
} from '@/lib/job-equipment-utils';
import { deleteEquipmentUsage } from '@/lib/job-equipment-actions';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/pjo-utils';

interface JobEquipmentListProps {
  usages: JobEquipmentUsage[];
  onComplete: (usage: JobEquipmentUsage) => void;
  onRefresh: () => void;
}

export function JobEquipmentList({
  usages,
  onComplete,
  onRefresh,
}: JobEquipmentListProps) {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteEquipmentUsage(deleteId);
    setIsDeleting(false);
    setDeleteId(null);

    if (result.success) {
      toast({
        title: 'Berhasil',
        description: 'Equipment usage berhasil dihapus',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal menghapus equipment usage',
        variant: 'destructive',
      });
    }
  };

  if (usages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Belum ada equipment yang ditambahkan ke job ini.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead className="text-right">KM</TableHead>
              <TableHead className="text-right">Jam</TableHead>
              <TableHead className="text-right">Biaya</TableHead>
              <TableHead className="text-right">Billing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usages.map((usage) => {
              const isCompleted = !!usage.usageEnd;
              const usageDays = calculateUsageDays(usage.usageStart, usage.usageEnd);

              return (
                <TableRow key={usage.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {usage.asset?.assetCode || '-'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {usage.asset?.assetName}
                      </div>
                      {usage.asset?.registrationNumber && (
                        <div className="text-xs text-muted-foreground">
                          {usage.asset.registrationNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(usage.usageStart)}
                      {usage.usageEnd && (
                        <>
                          <span className="mx-1">-</span>
                          {formatDate(usage.usageEnd)}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {usageDays} hari • {getRateTypeLabel(usage.rateType)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {usage.kmUsed != null ? (
                      <div>
                        <div>{usage.kmUsed.toLocaleString('id-ID')}</div>
                        <div className="text-xs text-muted-foreground">
                          {usage.startKm?.toLocaleString('id-ID')} →{' '}
                          {usage.endKm?.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ) : usage.startKm != null ? (
                      <div className="text-muted-foreground">
                        {usage.startKm.toLocaleString('id-ID')} → ...
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {usage.hoursUsed != null ? (
                      <div>
                        <div>{usage.hoursUsed.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {usage.startHours?.toFixed(1)} →{' '}
                          {usage.endHours?.toFixed(1)}
                        </div>
                      </div>
                    ) : usage.startHours != null ? (
                      <div className="text-muted-foreground">
                        {usage.startHours.toFixed(1)} → ...
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isCompleted ? (
                      <div>
                        <div className="font-medium">
                          {formatEquipmentCurrency(usage.totalCost)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          D: {formatEquipmentCurrency(usage.depreciationCost)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {usage.isBillable && usage.billingAmount ? (
                      <div className="font-medium text-green-600">
                        {formatEquipmentCurrency(usage.billingAmount)}
                      </div>
                    ) : !usage.isBillable ? (
                      <span className="text-muted-foreground">Non-billable</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isCompleted ? (
                      <Badge variant="default">Selesai</Badge>
                    ) : (
                      <Badge variant="secondary">Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isCompleted && (
                          <DropdownMenuItem onClick={() => onComplete(usage)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Selesaikan
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeleteId(usage.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Equipment Usage?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data penggunaan equipment akan
              dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
