import { notFound } from 'next/navigation';
import { getVessel } from '@/app/actions/vessel-tracking-actions';
import { getShippingLines } from '@/app/actions/shipping-line-actions';
import { EditVesselClient } from './edit-vessel-client';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

interface EditVesselPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVesselPage({ params }: EditVesselPageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/agency/vessels');
  }
  const { id } = await params;
  
  const [vessel, shippingLinesResult] = await Promise.all([
    getVessel(id),
    getShippingLines(),
  ]);

  if (!vessel) {
    notFound();
  }

  const shippingLines = shippingLinesResult.success && shippingLinesResult.data 
    ? shippingLinesResult.data 
    : [];

  return <EditVesselClient vessel={vessel} shippingLines={shippingLines} />;
}
