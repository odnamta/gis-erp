import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import { EmployeeDetailView } from '@/components/employees/employee-detail-view';
import { EmployeeActions } from '@/components/employees/employee-actions';
import { getEmployee, getUnlinkedUsers } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { canViewEmployees, canEditEmployee, canViewEmployeeSalary } from '@/lib/permissions';
import { UserProfile } from '@/types/permissions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
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
  if (!canViewEmployees(userProfile)) {
    redirect('/dashboard');
  }

  // Fetch employee and unlinked users in parallel
  const [employeeResult, unlinkedUsersResult] = await Promise.all([
    getEmployee(id),
    getUnlinkedUsers(),
  ]);

  if (employeeResult.error || !employeeResult.data) {
    notFound();
  }

  const employee = employeeResult.data;
  const canEdit = canEditEmployee(userProfile);
  const canViewSalary = canViewEmployeeSalary(userProfile);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hr/employees">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employee Details</h1>
            <p className="text-muted-foreground">
              View employee information
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EmployeeActions
            employeeId={employee.id}
            currentStatus={employee.status}
            userId={employee.user_id}
            availableUsers={unlinkedUsersResult.data || []}
            canEdit={canEdit}
          />
          {canEdit && (
            <Link href={`/hr/employees/${id}/edit`}>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Employee
              </Button>
            </Link>
          )}
        </div>
      </div>

      <EmployeeDetailView employee={employee} canViewSalary={canViewSalary} />
    </div>
  );
}
