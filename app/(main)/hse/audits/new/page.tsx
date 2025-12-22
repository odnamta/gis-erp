'use client';

import { useSearchParams } from 'next/navigation';
import { AuditForm } from '@/components/hse/audits/audit-form';

export default function NewAuditPage() {
  const searchParams = useSearchParams();
  const typeId = searchParams.get('type') || undefined;

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">New Audit</h1>
      <AuditForm preselectedTypeId={typeId} />
    </div>
  );
}
