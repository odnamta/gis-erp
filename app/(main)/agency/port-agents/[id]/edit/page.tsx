import { notFound } from 'next/navigation';
import { getPortAgentById } from '@/app/actions/port-agent-actions';
import { getPorts } from '@/app/actions/port-actions';
import { EditPortAgentClient } from './edit-port-agent-client';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

interface EditPortAgentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPortAgentPage({ params }: EditPortAgentPageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/agency/port-agents');
  }
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
