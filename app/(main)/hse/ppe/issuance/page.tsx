import { getPPEIssuances, getPPETypes } from '@/lib/ppe-actions';
import { createClient } from '@/lib/supabase/server';
import { IssuanceTable } from '@/components/ppe/issuance-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PPEEmployee } from '@/types/ppe';

async function getActiveEmployees(): Promise<PPEEmployee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, status')
    .eq('status', 'active')
    .order('full_name');
  
  if (error) throw new Error(`Failed to fetch employees: ${error.message}`);
  return (data || []).map(e => ({
    id: e.id,
    employee_code: e.employee_code,
    full_name: e.full_name,
    status: e.status || 'active',
  }));
}

export default async function PPEIssuancePage() {
  const [issuances, ppeTypes, employees] = await Promise.all([
    getPPEIssuances(),
    getPPETypes(),
    getActiveEmployees(),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PPE Issuance</h1>
        <p className="text-muted-foreground">
          Issue and track Personal Protective Equipment for employees.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issuance Records</CardTitle>
          <CardDescription>
            View all PPE issuances, returns, and replacements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IssuanceTable
            issuances={issuances}
            ppeTypes={ppeTypes}
            employees={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}
