'use client';

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
import { Edit, UserX, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { formatAttendanceTime, formatWorkHours, getStatusDisplayInfo } from '@/lib/attendance-utils';

interface EmployeeAttendance {
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    department_id: string | null;
    department_name: string | null;
  };
  attendance: AttendanceRecord | null;
}

interface AttendanceListProps {
  data: EmployeeAttendance[];
  onEdit?: (employeeId: string, attendance: AttendanceRecord | null) => void;
  onMarkAbsent?: (employeeId: string) => void;
  isLoading?: boolean;
}

export function AttendanceList({ data, onEdit, onMarkAbsent, isLoading }: AttendanceListProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Loading attendance data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No employees found
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(({ employee, attendance }) => {
            const status = attendance?.status || 'absent';
            const statusInfo = getStatusDisplayInfo(status as AttendanceStatus);

            return (
              <TableRow key={employee.id}>
                <TableCell className="font-mono text-sm">
                  {employee.employee_code}
                </TableCell>
                <TableCell className="font-medium">
                  {employee.full_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {employee.department_name || '-'}
                </TableCell>
                <TableCell>
                  {attendance?.clock_in ? (
                    <span>
                      {formatAttendanceTime(attendance.clock_in)}
                      {attendance.late_minutes > 0 && (
                        <span className="text-yellow-600 text-xs ml-1">
                          (+{attendance.late_minutes}m)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {attendance?.clock_out ? (
                    formatAttendanceTime(attendance.clock_out)
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {attendance?.work_hours !== null && attendance?.work_hours !== undefined ? (
                    <span>
                      {formatWorkHours(attendance.work_hours)}
                      {attendance.overtime_hours && attendance.overtime_hours > 0 && (
                        <span className="text-green-600 text-xs ml-1">
                          (+{formatWorkHours(attendance.overtime_hours)})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}
                  >
                    {statusInfo.icon} {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit?.(employee.id, attendance)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {attendance ? 'Edit Record' : 'Add Record'}
                      </DropdownMenuItem>
                      {!attendance && (
                        <DropdownMenuItem
                          onClick={() => onMarkAbsent?.(employee.id)}
                          className="text-red-600"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Mark Absent
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
