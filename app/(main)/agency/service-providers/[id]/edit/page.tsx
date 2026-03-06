import { notFound } from 'next/navigation';
import { getServiceProviderById } from '@/app/actions/service-provider-actions';
import { EditServiceProviderClient } from './edit-service-provider-client';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

interface EditServiceProviderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServiceProviderPage({ params }: EditServiceProviderPageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/agency/service-providers');
  }
  const { id } = await params;
  const result = await getServiceProviderById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <EditServiceProviderClient serviceProvider={result.data} />;
}
