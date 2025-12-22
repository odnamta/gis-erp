import { DepreciationClient } from './depreciation-client';

export const metadata = {
  title: 'Asset Depreciation | Gama ERP',
  description: 'View asset depreciation schedule and history',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DepreciationPage({ params }: PageProps) {
  const { id } = await params;
  return <DepreciationClient assetId={id} />;
}
