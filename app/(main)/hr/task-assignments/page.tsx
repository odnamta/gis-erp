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
import { getTaskAssignments } from '@/lib/task-assignment-actions';
import {
  TaskAssignmentStatus,
  TaskAssignmentPriority,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/types/task-assignment';
import { formatDate } from '@/lib/utils/format';
import { Plus, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

function StatusBadge({ status }: { status: TaskAssignmentStatus }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return (
    <Badge className={`${colorClass} hover:${colorClass}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TaskAssignmentPriority }) {
  const colorClass = PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-800';
  return (
    <Badge className={`${colorClass} hover:${colorClass}`}>
      {PRIORITY_LABELS[priority] || priority}
    </Badge>
  );
}

export default async function TaskAssignmentsPage() {
  const assignments = await getTaskAssignments();

  const stats = {
    total: assignments.length,
    pending: assignments.filter((a) => a.status === 'pending').length,
    approved: assignments.filter((a) => a.status === 'approved').length,
    rejected: assignments.filter((a) => a.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Surat Tugas</h1>
          <p className="text-muted-foreground">Kelola surat tugas dan penugasan karyawan</p>
        </div>
        <Button asChild>
          <Link href="/hr/task-assignments/new">
            <Plus className="mr-2 h-4 w-4" />
            Buat Surat Tugas
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Surat</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Judul Tugas</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Belum ada surat tugas
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Link
                        href={`/hr/task-assignments/${assignment.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {assignment.request_number}
                      </Link>
                    </TableCell>
                    <TableCell>{assignment.employee?.full_name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {assignment.task_title}
                    </TableCell>
                    <TableCell>{assignment.location || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(assignment.start_date)} - {formatDate(assignment.end_date)}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={assignment.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={assignment.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
