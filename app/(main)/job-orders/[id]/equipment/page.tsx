import { EquipmentClient } from './equipment-client';

export const metadata = {
  title: 'Equipment Job Order | Gama ERP',
  description: 'Manage equipment usage for job order',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EquipmentPage({ params }: PageProps) {
  const { id } = await params;
  return <EquipmentClient jobOrderId={id} />;
}
