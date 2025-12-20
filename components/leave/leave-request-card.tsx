'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeaveStatusBadge } from './leave-status-badge';
import { LeaveRequest } from '@/types/leave';
import { formatDays } from '@/lib/leave-utils';
import { format, parseISO } from 'date-fns';
import { Paperclip, User, Calendar, FileText } from 'lucide-react';

interface LeaveRequestCardProps {
  request: LeaveRequest;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onView?: () => void;
  currentBalance?: number;
}

export function LeaveRequestCard({
  request,
  showActions = false,
  onApprove,
  onReject,
  onCancel,
  onView,
  currentBalance,
}: LeaveRequestCardProps) {
  const startDate = parseISO(request.start_date);
  const endDate = parseISO(request.end_date);
  
  const dateRange = request.start_date === request.end_date
    ? format(startDate, 'd MMM yyyy')
    : `${format(startDate, 'd MMM yyyy')} - ${format(endDate, 'd MMM yyyy')}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-mono text-muted-foreground">{request.request_number}</p>
          </div>
          <LeaveStatusBadge status={request.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">{request.employee?.full_name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{request.employee?.department || ''}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">{request.leave_type?.type_name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{formatDays(request.total_days)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{dateRange}</span>
          {request.is_half_day && (
            <span className="text-muted-foreground">({request.half_day_type})</span>
          )}
        </div>

        {request.reason && (
          <div className="flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground">{request.reason}</span>
          </div>
        )}

        {request.handover_employee && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Handover to: {request.handover_employee.full_name}
            </span>
          </div>
        )}

        {request.attachment_url && (
          <div className="flex items-center gap-2 text-sm">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <a 
              href={request.attachment_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View attachment
            </a>
          </div>
        )}

        {request.rejection_reason && (
          <div className="p-2 bg-red-50 rounded text-sm text-red-700">
            <strong>Rejection reason:</strong> {request.rejection_reason}
          </div>
        )}

        {currentBalance !== undefined && request.status === 'pending' && (
          <div className="text-sm text-muted-foreground">
            Balance: <span className="font-medium text-green-600">{formatDays(currentBalance)} available</span>
          </div>
        )}

        {showActions && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            {request.status === 'pending' && onApprove && onReject && (
              <>
                <Button size="sm" variant="outline" onClick={onReject}>
                  Reject
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onApprove}>
                  Approve
                </Button>
              </>
            )}
            {request.status === 'pending' && onCancel && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onView && (
              <Button size="sm" variant="ghost" onClick={onView}>
                View
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
