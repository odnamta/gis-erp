import { Metadata } from 'next';
import { FeedbackDashboard } from './feedback-dashboard';
import { getAllFeedback, getFeedbackSummary } from '@/app/actions/feedback';
import type { FeedbackListItem, FeedbackSummary, PaginatedFeedback } from '@/types/feedback';

export const metadata: Metadata = {
  title: 'Feedback Management | Gama ERP',
  description: 'Manage bug reports and improvement requests',
};

export default async function FeedbackPage() {
  // Fetch initial data server-side to eliminate client-side waterfall
  const [summaryResult, feedbackResult] = await Promise.all([
    getFeedbackSummary(),
    getAllFeedback({}, 1, 20),
  ]);

  const initialSummary: FeedbackSummary | null =
    summaryResult.success && summaryResult.data ? summaryResult.data : null;

  const initialFeedback: PaginatedFeedback | null =
    feedbackResult.success && feedbackResult.data ? feedbackResult.data : null;

  return (
    <FeedbackDashboard
      initialSummary={initialSummary}
      initialFeedback={initialFeedback}
    />
  );
}
