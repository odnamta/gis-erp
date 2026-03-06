import { getFrequentHSCodesAction } from '@/lib/hs-actions';
import { HSCodesPageClient } from './hs-codes-page-client';
import type { HSCode } from '@/types/hs-codes';

export default async function HSCodesPage() {
  // Fetch frequent codes server-side to eliminate client-side waterfall
  const frequentResult = await getFrequentHSCodesAction(5);
  const frequentCodes: HSCode[] =
    frequentResult.success && frequentResult.data ? frequentResult.data : [];

  return <HSCodesPageClient initialFrequentCodes={frequentCodes} />;
}
