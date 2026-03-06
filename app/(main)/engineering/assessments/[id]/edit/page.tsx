// app/(main)/engineering/assessments/[id]/edit/page.tsx
// Edit Technical Assessment page (v0.58)

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssessmentForm } from '@/components/assessments/assessment-form';
import { getAssessment, getAssessmentTypes } from '@/lib/assessment-actions';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

interface EditAssessmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAssessmentPage({ params }: EditAssessmentPageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/engineering/assessments');
  }
  const { id } = await params;
  const [assessment, assessmentTypes] = await Promise.all([
    getAssessment(id),
    getAssessmentTypes(),
  ]);

  if (!assessment) {
    notFound();
  }

  // Check if assessment can be edited
  if (!['draft', 'in_progress', 'rejected'].includes(assessment.status)) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Cannot Edit Assessment</h1>
          <p className="text-muted-foreground mb-6">
            This assessment is in &quot;{assessment.status}&quot; status and cannot be edited.
          </p>
          <Button asChild>
            <Link href={`/engineering/assessments/${id}`}>
              View Assessment
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/engineering/assessments/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessment
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Assessment</h1>
        <p className="text-muted-foreground">
          {assessment.assessment_number} - {assessment.title}
        </p>
      </div>

      {/* Form */}
      <AssessmentForm assessment={assessment} assessmentTypes={assessmentTypes} />
    </div>
  );
}
