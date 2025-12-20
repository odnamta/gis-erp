'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LeaveRequestList } from '@/components/leave/leave-request-list';
import { LeaveRequest, LeaveType, LeaveBalance } from '@/types/leave';
import {
  getLeaveRequests,
  getLeaveTypes,
  getLeaveBalances,
  getEmployeesForSelect,
  getPendingRequestsCount,
} from './actions';
import { Plus, Loader2, Bell } from 'lucide-react';

export default function LeaveRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [balancesMap, setBalancesMap] = useState<Map<string, LeaveBalance>>(new Map());
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [requestsData, typesData, employeesData, count] = await Promise.all([
        getLeaveRequests(),
        getLeaveTypes(),
        getEmployeesForSelect(),
        getPendingRequestsCount(),
      ]);

      setRequests(requestsData);
      setLeaveTypes(typesData);
      setEmployees(employeesData);
      setPendingCount(count);

      // Load balances for all employees with pending requests
      const pendingEmployeeIds = new Set(
        requestsData
          .filter(r => r.status === 'pending')
          .map(r => r.employee_id)
      );

      const balances = new Map<string, LeaveBalance>();
      for (const employeeId of pendingEmployeeIds) {
        const empBalances = await getLeaveBalances(employeeId);
        for (const balance of empBalances) {
          balances.set(`${employeeId}-${balance.leave_type_id}`, balance);
        }
      }
      setBalancesMap(balances);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsLoading(true);
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              <Bell className="h-4 w-4" />
              {pendingCount} pending
            </span>
          )}
        </div>
        <Button onClick={() => router.push('/hr/leave/request')}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      <LeaveRequestList
        requests={requests}
        leaveTypes={leaveTypes}
        employees={employees}
        balances={balancesMap}
        showEmployeeFilter={true}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
