import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EmployeeSummaryCards } from '@/components/employees/employee-summary-cards';
import { EmployeeFilters } from '@/components/employees/employee-filters';
import { EmployeeTable } from '@/components/employees/employee-table';
import { getEmployees, getDepartments } from './actions';
import { calculateEmployeeSummaryStats } from '@/lib/employee-utils';
import { createClient } from '@/lib/supabase/server';
import { canCreateEmployee, canEditEmployee } from '@/lib/permissions';
import { EmployeeStatus } from '@/types/employees';
import { UserProfile } from '@/types/permissions';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    department?: string;
    status?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // Get current user profile for permissions
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userProfile: UserProfile | null = null;
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    userProfile = data as unknown as UserProfile | null;
  }

  // Fetch data
  const [employeesResult, departmentsResult] = await Promise.all([
    getEmployees({
      search: params.search,
      departmentId: params.department,
      status: params.status as EmployeeStatus | undefined,
    }),
    getDepartments(),
  ]);

  const employees = employeesResult.data || [];
  const departments = departmentsResult.data || [];
  const stats = calculateEmployeeSummaryStats(employees);

  const canCreate = canCreateEmployee(userProfile);
  const canEdit = canEditEmployee(userProfile);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            Manage employee records and information
          </p>
        </div>
        {canCreate && (
          <Link href="/hr/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        )}
      </div>

      <EmployeeSummaryCards stats={stats} />

      <Suspense fallback={<div>Loading filters...</div>}>
        <EmployeeFilters departments={departments} />
      </Suspense>

      <EmployeeTable employees={employees} canEdit={canEdit} />
    </div>
  );
}
