import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAdvanceRequests, getAdvanceStats } from '@/lib/advance-request-actions';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { BKK_STATUS_COLORS } from '@/lib/bkk-utils';
import type { BKKStatus } from '@/types';
import { Plus, FileText, Clock, AlertTriangle } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const info = BKK_STATUS_COLORS[status as BKKStatus] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  return (
    <Badge className={`${info.bg} ${info.text} border-0`}>
      {info.label}
    </Badge>
  );
}

function OverdueBadge() {
  return (
    <Badge className="bg-red-100 text-red-800 border-0 ml-1">
      Terlambat
    </Badge>
  );
}

function isOverdue(returnDeadline: string | null, status: string): boolean {
  if (!returnDeadline) return false;
  const terminal = ['settled', 'cancelled', 'rejected'];
  if (terminal.includes(status)) return false;
  const today = new Date().toISOString().split('T')[0];
  return returnDeadline < today;
}

export default async function AdvanceRequestsPage() {
  const [requests, stats] = await Promise.all([
    getAdvanceRequests(),
    getAdvanceStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advance Request</h1>
          <p className="text-muted-foreground">
            Kelola permintaan advance (uang muka) berbasis BKK
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/advance-requests/new">
            <Plus className="mr-2 h-4 w-4" />
            Buat Advance Baru
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Advance</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.overdue > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : ''}`}>
              {stats.overdue}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. BKK</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Deadline Pengembalian</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada advance request
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => {
                  const overdue = isOverdue(req.return_deadline, req.status);
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Link
                          href={`/disbursements/${req.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {req.bkk_number}
                        </Link>
                      </TableCell>
                      <TableCell>{req.advance_recipient_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(req.amount_requested)}
                      </TableCell>
                      <TableCell>
                        {req.return_deadline ? (
                          <span className={overdue ? 'text-red-600 font-medium' : ''}>
                            {formatDate(req.return_deadline)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusBadge status={req.status} />
                          {overdue && <OverdueBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(req.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
