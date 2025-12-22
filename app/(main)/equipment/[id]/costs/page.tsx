import { CostsClient } from './costs-client';

export const metadata = {
  title: 'Asset Costs | Gama ERP',
  description: 'View asset cost history and breakdown',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CostsPage({ params }: PageProps) {
  const { id } = await params;
  return <CostsClient assetId={id} />;
}
