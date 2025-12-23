import { notFound } from 'next/navigation';
import { getPortAgentById, getPorts } from '@/app/actions/agency-actions';
import { EditPortAgentClient } from './edit-port-agent-client';

interface EditPortAgentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPortAgentPage({ params }: EditPortAgentPageProps) {
  const { id } = await params;
  
  const [agentResult, portsResult] = await Promise.all([
    getPortAgentById(id),
    getPorts(),
  ]);

  if (!agentResult.success || !agentResult.data) {
    notFound();
  }

  return (
    <EditPortAgentClient 
      portAgent={agentResult.data} 
      ports={portsResult.data || []} 
    />
  );
}
