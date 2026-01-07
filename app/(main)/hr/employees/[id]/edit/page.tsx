import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EmployeeForm } from '@/components/employees/employee-form';
import {
  getEmployee,
  getDepartments,
  getPositions,
  getEmployeesForDropdown,
} from '../../actions';
import { createClient } from '@/lib/supabase/server';
import { canEditEmployee, canEditEmployeeSalary } from '@/lib/permissions';
import { UserProfile } from '@/types/permissions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;

  // Get current user profile for permissions
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: userProfileData } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const userProfile = userProfileData as unknown as UserProfile | null;

  // Check permission
  if (!canEditEmployee(userProfile)) {
    redirect('/hr/employees');
  }

  // Fetch data
  const [employeeResult, departmentsResult, positionsResult, employeesResult] = await Promise.all([
    getEmployee(id),
    getDepartments(),
    getPositions(),
    getEmployeesForDropdown(),
  ]);

  if (employeeResult.error || !employeeResult.data) {
    notFound();
  }

  const employee = employeeResult.data;
  const departments = departmentsResult.data || [];
  const positions = positionsResult.data || [];
  const employees = employeesResult.data || [];

  const canEditSalary = canEditEmployeeSalary(userProfile);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/hr/employees/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Employee</h1>
          <p className="text-muted-foreground">
            Update employee information for {employee.full_name}
          </p>
        </div>
      </div>

      <EmployeeForm
        employee={employee}
        departments={departments}
        positions={positions}
        employees={employees}
        canEditSalary={canEditSalary}
      />
    </div>
  );
}
