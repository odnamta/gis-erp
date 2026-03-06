'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { AttendanceSummaryCards } from '@/components/attendance/attendance-summary-cards';
import { AttendanceFilters } from '@/components/attendance/attendance-filters';
import { AttendanceList } from '@/components/attendance/attendance-list';
import { ManualEntryDialog } from '@/components/attendance/manual-entry-dialog';
import {
  getAttendanceSummary,
  getEmployeesWithAttendance,
  markAbsent,
} from './actions';
import { getDepartments } from '../employees/actions';
import { AttendanceSummary, AttendanceStatus, AttendanceRecord } from '@/types/attendance';
import { toast } from 'sonner';

interface Department {
  id: string;
  department_name: string;
}

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

export default function AttendancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    holiday: 0,
  });
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendance[]>([]);

  // Manual entry dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<{
    id: string;
    name: string;
    attendance: AttendanceRecord | null;
  } | null>(null);

  const dateString = date.toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryResult, attendanceResult, deptResult] = await Promise.all([
        getAttendanceSummary(dateString),
        getEmployeesWithAttendance(dateString, selectedDepartment || undefined),
        getDepartments(),
      ]);

      if (summaryResult.data) {
        setSummary(summaryResult.data);
      }
      if (attendanceResult.data) {
        // Apply status filter client-side
        let filtered = attendanceResult.data;
        if (selectedStatus) {
          filtered = filtered.filter((item) => {
            const status = item.attendance?.status || 'absent';
            return status === selectedStatus;
          });
        }
        setAttendanceData(filtered);
      }
      if (deptResult.data) {
        setDepartments(deptResult.data);
      }
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  }, [dateString, selectedDepartment, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (employeeId: string, attendance: AttendanceRecord | null) => {
    const employee = attendanceData.find((d) => d.employee.id === employeeId);
    if (employee) {
      setEditingEmployee({
        id: employeeId,
        name: employee.employee.full_name,
        attendance,
      });
      setDialogOpen(true);
    }
  };

  const handleMarkAbsent = async (employeeId: string) => {
    const result = await markAbsent(employeeId, dateString);
    if (result.success) {
      toast.success('Employee marked as absent');
      loadData();
    } else {
      toast.error(result.error || 'Failed to mark absent');
    }
  };

  const handleExport = () => {
    // Build CSV content
    const headers = ['Code', 'Name', 'Department', 'Clock In', 'Clock Out', 'Hours', 'Status'];
    const rows = attendanceData.map((item) => {
      const { employee, attendance } = item;
      return [
        employee.employee_code,
        employee.full_name,
        employee.department_name || '',
        attendance?.clock_in ? new Date(attendance.clock_in).toLocaleTimeString() : '',
        attendance?.clock_out ? new Date(attendance.clock_out).toLocaleTimeString() : '',
        attendance?.work_hours?.toString() || '',
        attendance?.status || 'absent',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateString}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Attendance exported');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
        <p className="text-muted-foreground">
          View and manage employee attendance records
        </p>
      </div>

      <AttendanceSummaryCards summary={summary} isLoading={isLoading} />

      <AttendanceFilters
        date={date}
        onDateChange={setDate}
        departments={departments}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onExport={handleExport}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AttendanceList
          data={attendanceData}
          onEdit={handleEdit}
          onMarkAbsent={handleMarkAbsent}
        />
      )}

      {editingEmployee && (
        <ManualEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employeeId={editingEmployee.id}
          employeeName={editingEmployee.name}
          date={dateString}
          existingRecord={editingEmployee.attendance}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
