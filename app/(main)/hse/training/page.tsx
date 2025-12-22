import { TrainingDashboardClient } from './training-client';
import {
  getTrainingStatistics,
  getComplianceMatrix,
  getExpiringTraining,
  getUpcomingSessions,
} from '@/lib/training-actions';

export default async function TrainingDashboardPage() {
  const [statistics, complianceEntries, expiringTraining, upcomingSessions] = await Promise.all([
    getTrainingStatistics(),
    getComplianceMatrix(),
    getExpiringTraining(60),
    getUpcomingSessions(),
  ]);

  return (
    <TrainingDashboardClient
      statistics={statistics}
      complianceEntries={complianceEntries}
      expiringTraining={expiringTraining}
      upcomingSessions={upcomingSessions}
    />
  );
}
