import { notFound } from 'next/navigation';
import { getServiceProviderById } from '@/app/actions/agency-actions';
import { EditServiceProviderClient } from './edit-service-provider-client';

interface EditServiceProviderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServiceProviderPage({ params }: EditServiceProviderPageProps) {
  const { id } = await params;
  const result = await getServiceProviderById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <EditServiceProviderClient serviceProvider={result.data} />;
}
