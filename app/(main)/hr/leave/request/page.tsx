'use client';

import { useEffect, useState } from 'react';
import { LeaveRequestForm } from '@/components/leave/leave-request-form';
import { LeaveType, LeaveBalance } from '@/types/leave';
import {
  getLeaveTypes,
  getLeaveBalances,
  getEmployeesForSelect,
  getCurrentEmployeeId,
  initializeYearlyBalances,
} from '../actions';
import { Loader2 } from 'lucide-react';

export default function LeaveRequestPage() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string; department: string }[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
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

        const [typesData, balancesData, employeesData] = await Promise.all([
          getLeaveTypes(),
          getLeaveBalances(empId, currentYear),
          getEmployeesForSelect(),
        ]);

        setLeaveTypes(typesData);
        setBalances(balancesData);
        setEmployees(employeesData);

        // TODO: Load holidays from database
        setHolidays([]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Request Leave</h1>
      
      <LeaveRequestForm
        employeeId={employeeId}
        leaveTypes={leaveTypes}
        balances={balances}
        employees={employees}
        holidays={holidays}
      />
    </div>
  );
}
