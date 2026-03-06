import { getCustomers, getQuotations, getProjects, getEmployees } from '@/lib/survey-actions';
import { SurveyForm } from '@/components/surveys/survey-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export default async function NewSurveyPage() {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/engineering/surveys');
  }
  const [customersResult, quotationsResult, projectsResult, employeesResult] = await Promise.all([
    getCustomers(),
    getQuotations(),
    getProjects(),
    getEmployees(),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/engineering/surveys">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Route Survey</h1>
          <p className="text-muted-foreground">
            Create a new route survey request
          </p>
        </div>
      </div>

      <SurveyForm
        customers={customersResult.data || []}
        quotations={quotationsResult.data || []}
        projects={projectsResult.data || []}
        employees={employeesResult.data || []}
      />
    </div>
  );
}
