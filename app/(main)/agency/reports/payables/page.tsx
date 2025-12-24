import { Suspense } from 'react';
import { PayablesClient } from './payables-client';
import { getVendorInvoices } from '@/app/actions/vendor-invoice-actions';
import { getServiceProviders } from '@/app/actions/agency-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function VendorPayablesPage() {
  // Fetch initial data in parallel
  const [invoicesResult, vendorsResult] = await Promise.all([
    getVendorInvoices(),
    getServiceProviders(),
  ]);

  const invoices = invoicesResult.success ? invoicesResult.data || [] : [];
  const vendors = vendorsResult.success ? vendorsResult.data || [] : [];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PayablesClient
        initialInvoices={invoices}
        vendors={vendors}
      />
    </Suspense>
  );
}
