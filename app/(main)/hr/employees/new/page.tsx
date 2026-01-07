import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EmployeeForm } from '@/components/employees/employee-form';
import {
  getDepartments,
  getPositions,
  getEmployeesForDropdown,
  getEmployeeCount,
} from '../actions';
import { createClient } from '@/lib/supabase/server';
import { canCreateEmployee, canEditEmployeeSalary } from '@/lib/permissions';
import { generateEmployeeCode } from '@/lib/employee-utils';
import { UserProfile } from '@/types/permissions';

export default async function NewEmployeePage() {
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
  if (!canCreateEmployee(userProfile)) {
    redirect('/hr/employees');
  }

  // Fetch data for form
  const [departmentsResult, positionsResult, employeesResult, countResult] = await Promise.all([
    getDepartments(),
    getPositions(),
    getEmployeesForDropdown(),
    getEmployeeCount(),
  ]);

  const departments = departmentsResult.data || [];
  const positions = positionsResult.data || [];
  const employees = employeesResult.data || [];
  const nextCode = generateEmployeeCode(countResult.count);

  const canEditSalary = canEditEmployeeSalary(userProfile);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hr/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Employee</h1>
          <p className="text-muted-foreground">
            Create a new employee record
          </p>
        </div>
      </div>

      <EmployeeForm
        departments={departments}
        positions={positions}
        employees={employees}
        canEditSalary={canEditSalary}
        nextCode={nextCode}
      />
    </div>
  );
}
