'use client';

// app/(main)/engineering/assessments/page.tsx
// Technical Assessments list page (v0.58)

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AssessmentStatusCards } from '@/components/assessments/assessment-status-cards';
import { AssessmentList } from '@/components/assessments/assessment-list';
import { 
  getAssessments, 
  getAssessmentTypes,
  getAssessmentStatusCounts 
} from '@/lib/assessment-actions';
import { 
  TechnicalAssessment, 
  TechnicalAssessmentType,
  AssessmentFilters 
} from '@/types/assessment';

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<TechnicalAssessment[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<TechnicalAssessmentType[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    draft: 0,
    in_progress: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    superseded: 0,
    total: 0,
  });
  const [filters, setFilters] = useState<AssessmentFilters>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentsData, typesData, countsData] = await Promise.all([
        getAssessments(filters),
        getAssessmentTypes(),
        getAssessmentStatusCounts(),
      ]);
      setAssessments(assessmentsData);
      setAssessmentTypes(typesData);
      setStatusCounts({
        draft: countsData.draft || 0,
        in_progress: countsData.in_progress || 0,
        pending_review: countsData.pending_review || 0,
        approved: countsData.approved || 0,
        rejected: countsData.rejected || 0,
        superseded: countsData.superseded || 0,
        total: countsData.total || 0,
      });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (status: string | null) => {
    setFilters(prev => ({
      ...prev,
      status: status as AssessmentFilters['status'],
    }));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Technical Assessments</h1>
          <p className="text-muted-foreground">
            Manage lifting studies, load calculations, and equipment specifications
          </p>
        </div>
        <Button asChild>
          <Link href="/engineering/assessments/new">
            <Plus className="h-4 w-4 mr-2" />
            New Assessment
          </Link>
        </Button>
      </div>

      {/* Status Cards */}
      <AssessmentStatusCards
        counts={statusCounts}
        onStatusClick={handleStatusClick}
        selectedStatus={filters.status || null}
      />

      {/* Assessment List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <AssessmentList
          assessments={assessments}
          assessmentTypes={assessmentTypes}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
    </div>
  );
}
