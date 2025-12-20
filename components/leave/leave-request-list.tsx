'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LeaveStatusBadge } from './leave-status-badge';
import { LeaveRequestCard } from './leave-request-card';
import { ApproveRejectDialog } from './approve-reject-dialog';
import { LeaveFilters } from './leave-filters';
import { LeaveRequest, LeaveType, LeaveRequestFilters, LeaveBalance } from '@/types/leave';
import { formatDays } from '@/lib/leave-utils';
import { format, parseISO } from 'date-fns';
import { Eye, Bell } from 'lucide-react';

interface LeaveRequestListProps {
  requests: LeaveRequest[];
  leaveTypes: LeaveType[];
  employees?: { id: string; full_name: string }[];
  balances?: Map<string, LeaveBalance>;
  showEmployeeFilter?: boolean;
  onRefresh: () => void;
}

export function LeaveRequestList({
  requests,
  leaveTypes,
  employees = [],
  balances,
  showEmployeeFilter = true,
  onRefresh,
}: LeaveRequestListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<LeaveRequestFilters>({});
  const [dialogState, setDialogState] = useState<{
    requestId: string;
    requestNumber: string;
    employeeName: string;
    action: 'approve' | 'reject' | null;
  } | null>(null);

  // Filter requests
  const filteredRequests = requests.filter(request => {
    if (filters.employee_id && request.employee_id !== filters.employee_id) return false;
    if (filters.leave_type_id && request.leave_type_id !== filters.leave_type_id) return false;
    if (filters.status && request.status !== filters.status) return false;
    if (filters.start_date && request.start_date < filters.start_date) return false;
    if (filters.end_date && request.end_date > filters.end_date) return false;
    return true;
  });

  // Separate pending and other requests
  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const otherRequests = filteredRequests.filter(r => r.status !== 'pending');

  const handleApprove = (request: LeaveRequest) => {
    setDialogState({
      requestId: request.id,
      requestNumber: request.request_number,
      employeeName: request.employee?.full_name || 'Unknown',
      action: 'approve',
    });
  };

  const handleReject = (request: LeaveRequest) => {
    setDialogState({
      requestId: request.id,
      requestNumber: request.request_number,
      employeeName: request.employee?.full_name || 'Unknown',
      action: 'reject',
    });
  };

  const handleDialogClose = () => {
    setDialogState(null);
  };

  const handleDialogSuccess = () => {
    onRefresh();
  };

  const getBalance = (request: LeaveRequest): number | undefined => {
    if (!balances) return undefined;
    const key = `${request.employee_id}-${request.leave_type_id}`;
    return balances.get(key)?.available_days;
  };

  return (
    <div className="space-y-6">
      <LeaveFilters
        filters={filters}
        onFiltersChange={setFilters}
        leaveTypes={leaveTypes}
        employees={employees}
        showEmployeeFilter={showEmployeeFilter}
      />

      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Pending Approval</h3>
            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              <Bell className="h-3 w-3" />
              {pendingRequests.length}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingRequests.map(request => (
              <LeaveRequestCard
                key={request.id}
                request={request}
                showActions
                onApprove={() => handleApprove(request)}
                onReject={() => handleReject(request)}
                currentBalance={getBalance(request)}
              />
            ))}
          </div>
        </div>
      )}

      {otherRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Requests</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherRequests.map(request => {
                  const startDate = parseISO(request.start_date);
                  const endDate = parseISO(request.end_date);
                  const dateRange = request.start_date === request.end_date
                    ? format(startDate, 'd MMM')
                    : `${format(startDate, 'd')}-${format(endDate, 'd MMM')}`;

                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">
                        {request.request_number}
                      </TableCell>
                      <TableCell>{request.employee?.full_name}</TableCell>
                      <TableCell>{request.leave_type?.type_name.split(' ')[0]}</TableCell>
                      <TableCell>{dateRange}</TableCell>
                      <TableCell>{formatDays(request.total_days)}</TableCell>
                      <TableCell>
                        <LeaveStatusBadge status={request.status} showIcon={false} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/hr/leave/${request.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {filteredRequests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No leave requests found
        </div>
      )}

      {dialogState && (
        <ApproveRejectDialog
          requestId={dialogState.requestId}
          requestNumber={dialogState.requestNumber}
          employeeName={dialogState.employeeName}
          action={dialogState.action}
          onClose={handleDialogClose}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
}
