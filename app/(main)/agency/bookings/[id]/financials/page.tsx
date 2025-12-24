import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { FinancialsClient } from './financials-client';
import { getBooking } from '@/app/actions/booking-actions';
import { getBookingFinancialSummary } from '@/app/actions/profitability-actions';
import { getShipmentCosts } from '@/app/actions/shipment-cost-actions';
import { getShipmentRevenue } from '@/app/actions/shipment-revenue-actions';
import { getVendorInvoicesByBooking } from '@/app/actions/vendor-invoice-actions';
import { getChargeTypes } from '@/app/actions/charge-type-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface FinancialsPageProps {
  params: Promise<{ id: string }>;
}

export default async function FinancialsPage({ params }: FinancialsPageProps) {
  const { id } = await params;

  // Fetch all data in parallel
  const [
    booking,
    financialSummaryResult,
    costsResult,
    revenueResult,
    vendorInvoicesResult,
    chargeTypesResult,
  ] = await Promise.all([
    getBooking(id),
    getBookingFinancialSummary(id),
    getShipmentCosts(id),
    getShipmentRevenue(id),
    getVendorInvoicesByBooking(id),
    getChargeTypes(),
  ]);

  if (!booking) {
    notFound();
  }

  // Extract data from results
  const financialSummary = financialSummaryResult.success ? financialSummaryResult.data ?? null : null;
  const costs = costsResult.success ? costsResult.data || [] : [];
  const revenue = revenueResult.success ? revenueResult.data || [] : [];
  const vendorInvoices = vendorInvoicesResult.success ? vendorInvoicesResult.data || [] : [];
  const chargeTypes = chargeTypesResult.success ? chargeTypesResult.data || [] : [];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FinancialsClient
        booking={booking}
        financialSummary={financialSummary}
        costs={costs}
        revenue={revenue}
        vendorInvoices={vendorInvoices}
        chargeTypes={chargeTypes}
      />
    </Suspense>
  );
}
