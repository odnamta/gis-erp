'use client';

import { useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkillsHeader } from './skills-header';
import { SkillsStatsCards } from './skills-stats-cards';
import { GapAnalysisTab } from './gap-analysis-tab';
import { ExpiringCertificationsTab } from './expiring-certifications-tab';
import { SkillsLibraryTab } from './skills-library-tab';
import { EmployeeSkillsTab } from './employee-skills-tab';
import {
  SkillGapAnalysis,
  ExpiringCertification,
  SkillsStats,
  Skill,
  SkillCategory,
} from '@/types/skills';
import {
  getSkillGapAnalysis,
  getExpiringCertifications,
  getSkillsStats,
} from '@/app/(main)/hr/skills/actions';
import { generateRecommendations } from '@/lib/skills-utils';

interface SkillsDashboardProps {
  initialGapAnalysis: SkillGapAnalysis[];
  initialExpiringCerts: ExpiringCertification[];
  initialStats: SkillsStats;
  skills: Skill[];
  categories: SkillCategory[];
  employees: { id: string; full_name: string; employee_code: string; department_id: string | null }[];
}

export function SkillsDashboard({
  initialGapAnalysis,
  initialExpiringCerts,
  initialStats,
  skills,
  categories,
  employees,
}: SkillsDashboardProps) {
  const [gapAnalysis, setGapAnalysis] = useState(initialGapAnalysis);
  const [expiringCerts, setExpiringCerts] = useState(initialExpiringCerts);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  const recommendations = generateRecommendations(gapAnalysis, expiringCerts);

  const handleRefresh = () => {
    startTransition(async () => {
      const [newGaps, newExpiring, newStats] = await Promise.all([
        getSkillGapAnalysis(),
        getExpiringCertifications(60),
        getSkillsStats(),
      ]);
      setGapAnalysis(newGaps);
      setExpiringCerts(newExpiring);
      setStats(newStats);
    });
  };

  return (
    <div className="space-y-6">
      <SkillsHeader onRefresh={handleRefresh} isLoading={isPending} />

      <SkillsStatsCards stats={stats} isLoading={isPending} />

      <Tabs defaultValue="gap-analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gap-analysis">Gap Analysis</TabsTrigger>
          <TabsTrigger value="by-employee">By Employee</TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Certifications
            {expiringCerts.length > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                {expiringCerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="library">Skills Library</TabsTrigger>
        </TabsList>

        <TabsContent value="gap-analysis">
          <GapAnalysisTab
            gapAnalysis={gapAnalysis}
            recommendations={recommendations}
            isLoading={isPending}
          />
        </TabsContent>

        <TabsContent value="by-employee">
          <EmployeeSkillsTab
            employees={employees}
            skills={skills}
            onUpdate={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="expiring">
          <ExpiringCertificationsTab
            certifications={expiringCerts}
            isLoading={isPending}
          />
        </TabsContent>

        <TabsContent value="library">
          <SkillsLibraryTab
            skills={skills}
            categories={categories}
            isLoading={isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
