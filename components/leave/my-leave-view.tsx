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
import { LeaveBalanceCards } from './leave-balance-cards';
import { LeaveStatusBadge } from './leave-status-badge';
import { LeaveRequest, LeaveType, LeaveBalance } from '@/types/leave';
import { formatDays } from '@/lib/leave-utils';
import { cancelLeaveRequest } from '@/app/(main)/hr/leave/actions';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Eye, X, Loader2 } from 'lucide-react';

interface MyLeaveViewProps {
  requests: LeaveRequest[];
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  onRefresh: () => void;
}

export function MyLeaveView({
  requests,
  balances,
  leaveTypes,
  onRefresh,
}: MyLeaveViewProps) {
  const router = useRouter();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleCancelClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedRequest) return;

    setIsCancelling(true);
    try {
      const result = await cancelLeaveRequest(selectedRequest.id);
      if (result.success) {
        toast.success('Leave request cancelled');
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to cancel request');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
      setSelectedRequest(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Balance Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Leave Balance {currentYear}</h3>
        <LeaveBalanceCards balances={balances} leaveTypes={leaveTypes} />
      </div>

      {/* Request History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">My Requests</h3>
        {requests.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(request => {
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
                      <TableCell>{request.leave_type?.type_name.split(' ')[0]}</TableCell>
                      <TableCell>{dateRange}</TableCell>
                      <TableCell>{formatDays(request.total_days)}</TableCell>
                      <TableCell>
                        <LeaveStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelClick(request)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/hr/leave/${request.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            No leave requests yet
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel leave request{' '}
              <strong>{selectedRequest?.request_number}</strong>?
              <br /><br />
              This will return the pending days to your available balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
