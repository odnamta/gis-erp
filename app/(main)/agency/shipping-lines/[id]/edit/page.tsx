import { notFound } from 'next/navigation';
import { getShippingLineById } from '@/app/actions/shipping-line-actions';
import { EditShippingLineClient } from './edit-shipping-line-client';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

interface EditShippingLinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditShippingLinePage({ params }: EditShippingLinePageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/agency/shipping-lines');
  }
  const { id } = await params;
  const result = await getShippingLineById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <EditShippingLineClient shippingLine={result.data} />;
}
