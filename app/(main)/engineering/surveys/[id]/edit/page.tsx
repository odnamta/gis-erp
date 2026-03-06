import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSurvey, getCustomers, getQuotations, getProjects, getEmployees } from '@/lib/survey-actions';
import { SurveyForm } from '@/components/surveys/survey-form';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

interface EditSurveyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSurveyPage({ params }: EditSurveyPageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/engineering/surveys');
  }
  const { id } = await params;
  
  const [surveyResult, customersResult, quotationsResult, projectsResult, employeesResult] = await Promise.all([
    getSurvey(id),
    getCustomers(),
    getQuotations(),
    getProjects(),
    getEmployees(),
  ]);

  if (!surveyResult.success || !surveyResult.data) {
    notFound();
  }

  const survey = surveyResult.data;

  // Only allow editing if survey is not completed or cancelled
  if (['completed', 'cancelled'].includes(survey.status)) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Cannot Edit Survey</h1>
          <p className="text-muted-foreground mb-4">
            This survey has been {survey.status} and cannot be edited.
          </p>
          <Button asChild>
            <Link href={`/engineering/surveys/${id}`}>View Survey</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/engineering/surveys/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Survey</h1>
          <p className="text-muted-foreground">{survey.surveyNumber}</p>
        </div>
      </div>

      <SurveyForm
        survey={survey}
        customers={customersResult.data || []}
        quotations={quotationsResult.data || []}
        projects={projectsResult.data || []}
        employees={employeesResult.data || []}
      />
    </div>
  );
}
