import { Metadata } from 'next';
import { SkillsDashboard } from '@/components/skills/skills-dashboard';
import {
  getSkillGapAnalysis,
  getExpiringCertifications,
  getSkillsStats,
  getSkills,
  getSkillCategories,
  getActiveEmployees,
} from './actions';

export const metadata: Metadata = {
  title: 'Skills Management | Gama ERP',
  description: 'Track employee skills, certifications, and identify capability gaps',
};

export default async function SkillsPage() {
  const [gapAnalysis, expiringCerts, stats, skills, categories, employees] = await Promise.all([
    getSkillGapAnalysis(),
    getExpiringCertifications(60),
    getSkillsStats(),
    getSkills(),
    getSkillCategories(),
    getActiveEmployees(),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <SkillsDashboard
        initialGapAnalysis={gapAnalysis}
        initialExpiringCerts={expiringCerts}
        initialStats={stats}
        skills={skills}
        categories={categories}
        employees={employees}
      />
    </div>
  );
}
