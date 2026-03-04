'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, ChevronRight, Banknote, Calendar, Clock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { MONTH_NAMES_ID } from '@/types/payroll';
import { getMyPayrollHistory, type MyPayrollRecord } from './actions';

function formatPeriodName(year: number, month: number): string {
  return `${MONTH_NAMES_ID[month - 1]} ${year}`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    calculated: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    paid: 'bg-blue-100 text-blue-800',
  };
  const labels: Record<string, string> = {
    calculated: 'Dihitung',
    approved: 'Disetujui',
    paid: 'Dibayar',
  };
  return (
    <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
      {labels[status] || status}
    </Badge>
  );
}

function PayrollDetail({ record, onClose }: { record: MyPayrollRecord; onClose: () => void }) {
  const earnings = (record.earnings || []) as Array<{ component_name: string; amount: number }>;
  const deductions = (record.deductions || []) as Array<{ component_name: string; amount: number }>;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Slip Gaji - {formatPeriodName(record.period.period_year, record.period.period_month)}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Net Salary - Prominent */}
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Gaji Bersih (Take Home Pay)</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(record.net_salary)}
          </p>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Gaji Kotor</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(record.gross_salary)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Potongan</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
              -{formatCurrency(record.total_deductions)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Work Data */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Data Kehadiran</h4>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground">Hari Kerja</p>
              <p className="font-medium">{record.work_days}</p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground">Hadir</p>
              <p className="font-medium text-green-600">{record.present_days}</p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground">Tidak Hadir</p>
              <p className="font-medium text-red-600">{record.absent_days}</p>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground">Lembur (jam)</p>
              <p className="font-medium text-orange-600">{record.overtime_hours}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Earnings Breakdown */}
        {earnings.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Penghasilan</h4>
            <div className="space-y-1">
              {earnings.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.component_name}</span>
                  <span className="text-green-600">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deductions Breakdown */}
        {deductions.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Potongan</h4>
              <div className="space-y-1">
                {deductions.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.component_name}</span>
                    <span className="text-red-600">-{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Status & Pay Date */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tanggal Gajian:</span>
            <span>{record.period.pay_date ? new Date(record.period.pay_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
          </div>
          <StatusBadge status={record.status} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyPayrollPage() {
  const [records, setRecords] = useState<MyPayrollRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MyPayrollRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await getMyPayrollHistory();
      setRecords(data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Slip Gaji</h1>
        <p className="text-muted-foreground">
          Lihat riwayat gaji Anda
        </p>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Banknote className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Belum ada data gaji</p>
            <p className="text-sm text-muted-foreground mt-1">
              Data slip gaji Anda akan muncul di sini setelah proses penggajian.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Period List */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Riwayat Gaji (12 Bulan Terakhir)</h2>
            {records.map((record) => (
              <Card
                key={record.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedRecord?.id === record.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedRecord(record)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {formatPeriodName(record.period.period_year, record.period.period_month)}
                        </p>
                        <StatusBadge status={record.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Gaji Bersih:</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(record.net_salary)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail Panel */}
          <div>
            {selectedRecord ? (
              <PayrollDetail
                record={selectedRecord}
                onClose={() => setSelectedRecord(null)}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Pilih periode untuk melihat detail slip gaji
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
