import { notFound } from 'next/navigation';
import { getShippingLineById } from '@/app/actions/agency-actions';
import { EditShippingLineClient } from './edit-shipping-line-client';

interface EditShippingLinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditShippingLinePage({ params }: EditShippingLinePageProps) {
  const { id } = await params;
  const result = await getShippingLineById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <EditShippingLineClient shippingLine={result.data} />;
}
