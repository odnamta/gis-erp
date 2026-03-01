'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PPEIssuance, PPEType, PPEEmployee } from '@/types/ppe';
import {
  formatIssuanceStatus,
  getIssuanceStatusColor,
  formatPPEDate,
  formatCondition,
  isReplacementOverdue,
  isReplacementDueSoon,
} from '@/lib/ppe-utils';
import { IssuanceForm } from './issuance-form';
import { ReturnForm } from './return-form';
import {
  MoreHorizontal,
  Plus,
  Eye,
  RotateCcw,
  AlertTriangle,
  Clock,
  HardHat,
} from 'lucide-react';

interface IssuanceTableProps {
  issuances: PPEIssuance[];
  ppeTypes: PPEType[];
  employees: PPEEmployee[];
}

export function IssuanceTable({ issuances, ppeTypes, employees }: IssuanceTableProps) {
  const router = useRouter();
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [returningIssuance, setReturningIssuance] = useState<PPEIssuance | null>(null);

  const getReplacementBadge = (issuance: PPEIssuance) => {
    if (!issuance.expected_replacement_date) return null;

    if (isReplacementOverdue(issuance.expected_replacement_date)) {
      return (
        <Badge variant="destructive" className="ml-2 text-xs">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Terlambat
        </Badge>
      );
    }

    if (isReplacementDueSoon(issuance.expected_replacement_date)) {
      return (
        <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-700">
          <Clock className="mr-1 h-3 w-3" />
          Segera
        </Badge>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Daftar Pengeluaran PPE</h2>
          <p className="text-sm text-muted-foreground">
            {issuances.length} catatan pengeluaran
          </p>
        </div>
        <Button onClick={() => setShowIssueForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Keluarkan PPE
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Karyawan</TableHead>
              <TableHead className="min-w-[140px]">Item PPE</TableHead>
              <TableHead className="text-center w-[60px]">Qty</TableHead>
              <TableHead className="w-[110px]">Tgl Dikeluarkan</TableHead>
              <TableHead className="w-[100px]">Kondisi</TableHead>
              <TableHead className="min-w-[140px]">Jadwal Penggantian</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issuances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  <HardHat className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Belum ada pengeluaran PPE. Keluarkan PPE untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              issuances.map(issuance => (
                <TableRow key={issuance.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{issuance.employee?.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {issuance.employee?.employee_code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{issuance.ppe_type?.ppe_name}</div>
                      {issuance.size && (
                        <div className="text-xs text-muted-foreground">
                          Ukuran: {issuance.size}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">{issuance.quantity}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatPPEDate(issuance.issued_date)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatCondition(issuance.condition_at_issue)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center flex-wrap gap-1">
                      <span className="text-sm">
                        {issuance.expected_replacement_date
                          ? formatPPEDate(issuance.expected_replacement_date)
                          : '-'}
                      </span>
                      {issuance.status === 'active' && getReplacementBadge(issuance)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getIssuanceStatusColor(issuance.status)}`}>
                      {formatIssuanceStatus(issuance.status)}
                    </Badge>
                    {issuance.returned_date && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatPPEDate(issuance.returned_date)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/hse/ppe/issuance/${issuance.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat Detail
                          </Link>
                        </DropdownMenuItem>
                        {issuance.status === 'active' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setReturningIssuance(issuance)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Kembalikan / Ganti
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <IssuanceForm
        open={showIssueForm}
        onOpenChange={setShowIssueForm}
        ppeTypes={ppeTypes}
        employees={employees}
        onSuccess={() => setShowIssueForm(false)}
      />

      <ReturnForm
        issuance={returningIssuance}
        open={!!returningIssuance}
        onOpenChange={open => !open && setReturningIssuance(null)}
        onSuccess={() => setReturningIssuance(null)}
      />
    </div>
  );
}
