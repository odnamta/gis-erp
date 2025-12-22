'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExpiringTraining } from '@/types/training';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { AlertTriangle, Clock } from 'lucide-react';

interface ExpiringTrainingListProps {
  items: ExpiringTraining[];
}

export function ExpiringTrainingList({ items }: ExpiringTrainingListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Tidak ada pelatihan yang akan kadaluarsa</h3>
        <p className="text-muted-foreground">
          Semua pelatihan masih berlaku
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: localeId });
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) {
      return <Badge variant="destructive">Sangat Mendesak</Badge>;
    }
    if (days <= 14) {
      return <Badge className="bg-orange-500">Mendesak</Badge>;
    }
    if (days <= 30) {
      return <Badge className="bg-yellow-500">Segera</Badge>;
    }
    return <Badge variant="outline">Perhatian</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Karyawan</TableHead>
          <TableHead>Departemen</TableHead>
          <TableHead>Kursus</TableHead>
          <TableHead>Kadaluarsa</TableHead>
          <TableHead>Sisa Hari</TableHead>
          <TableHead>Urgensi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={`${item.employeeCode}-${item.courseName}-${index}`}>
            <TableCell>
              <div>
                <p className="font-medium">{item.employeeName}</p>
                <p className="text-sm text-muted-foreground">{item.employeeCode}</p>
              </div>
            </TableCell>
            <TableCell>{item.departmentName}</TableCell>
            <TableCell>{item.courseName}</TableCell>
            <TableCell>{formatDate(item.validTo)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {item.daysUntilExpiry <= 7 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span className={item.daysUntilExpiry <= 7 ? 'text-red-600 font-medium' : ''}>
                  {item.daysUntilExpiry} hari
                </span>
              </div>
            </TableCell>
            <TableCell>{getUrgencyBadge(item.daysUntilExpiry)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
