import Link from 'next/link';
import { LeavePageClient } from './leave-page-client';
import {
  getLeaveRequests,
  getLeaveTypes,
  getLeaveBalancesBatch,
  getEmployeesForSelect,
  getPendingRequestsCount,
} from './actions';
import { LeaveBalance } from '@/types/leave';

export default async function LeaveRequestsPage() {
  try {
    const [requests, leaveTypes, employees, pendingCount] = await Promise.all([
      getLeaveRequests().catch(() => []),
      getLeaveTypes().catch(() => []),
      getEmployeesForSelect().catch(() => []),
      getPendingRequestsCount().catch(() => 0),
    ]);

    // Batch-fetch balances for all employees with pending requests
    const pendingEmployeeIds = [
      ...new Set(
        requests.filter((r) => r.status === 'pending').map((r) => r.employee_id)
      ),
    ];
    const balancesArray = await getLeaveBalancesBatch(pendingEmployeeIds);

    // Serialize as a plain record (Map is not serializable across server→client)
    const balancesRecord: Record<string, LeaveBalance> = {};
    for (const balance of balancesArray) {
      balancesRecord[`${balance.employee_id}-${balance.leave_type_id}`] = balance;
    }

    return (
      <LeavePageClient
        initialData={{
          requests,
          leaveTypes,
          employees,
          pendingCount,
          balancesRecord,
        }}
      />
    );
  } catch (error) {
    console.error('[Leave Page] Failed to load data:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive text-lg font-medium">
          Terjadi kesalahan saat memuat data cuti
        </p>
        <Link
          href="/hr/leave"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Coba Lagi
        </Link>
      </div>
    );
  }
}
