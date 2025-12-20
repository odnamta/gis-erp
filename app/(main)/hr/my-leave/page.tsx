'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MyLeaveView } from '@/components/leave/my-leave-view';
import { LeaveRequest, LeaveType, LeaveBalance } from '@/types/leave';
import {
  getMyLeaveRequests,
  getLeaveTypes,
  getLeaveBalances,
  getCurrentEmployeeId,
  initializeYearlyBalances,
} from '../leave/actions';
import { Plus, Loader2 } from 'lucide-react';

export default function MyLeavePage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const empId = await getCurrentEmployeeId();
      if (!empId) {
        console.error('No employee found for current user');
        setIsLoading(false);
        return;
      }
      setEmployeeId(empId);

      const currentYear = new Date().getFullYear();

      // Initialize balances if needed
      await initializeYearlyBalances(empId, currentYear);

      const [requestsData, balancesData, typesData] = await Promise.all([
        getMyLeaveRequests(empId),
        getLeaveBalances(empId, currentYear),
        getLeaveTypes(),
      ]);

      setRequests(requestsData);
      setBalances(balancesData);
      setLeaveTypes(typesData);
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

  if (!employeeId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No employee profile found for your account.</p>
        <p className="text-sm text-muted-foreground mt-2">Please contact HR to set up your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Leave</h1>
        <Button onClick={() => router.push('/hr/leave/request')}>
          <Plus className="h-4 w-4 mr-2" />
          Request Leave
        </Button>
      </div>

      <MyLeaveView
        requests={requests}
        balances={balances}
        leaveTypes={leaveTypes}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
