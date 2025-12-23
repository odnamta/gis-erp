'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PortAgentForm } from '@/components/agency/port-agent-form';
import { PortAgent, PortAgentFormData, Port } from '@/types/agency';
import { updatePortAgent } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

interface EditPortAgentClientProps {
  portAgent: PortAgent;
  ports: Port[];
}

export function EditPortAgentClient({ portAgent, ports }: EditPortAgentClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: PortAgentFormData) => {
    setIsLoading(true);
    try {
      const result = await updatePortAgent(portAgent.id, data);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Port agent updated successfully',
        });
        router.push(`/agency/port-agents/${portAgent.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update port agent',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating port agent:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert PortAgent to PortAgentFormData
  const formData: PortAgentFormData = {
    agentCode: portAgent.agentCode,
    agentName: portAgent.agentName,
    portId: portAgent.portId,
    portName: portAgent.portName,
    portCountry: portAgent.portCountry,
    address: portAgent.address,
    phone: portAgent.phone,
    email: portAgent.email,
    website: portAgent.website,
    contacts: portAgent.contacts,
    services: portAgent.services,
    customsLicense: portAgent.customsLicense,
    ppjkLicense: portAgent.ppjkLicense,
    otherLicenses: portAgent.otherLicenses,
    paymentTerms: portAgent.paymentTerms,
    currency: portAgent.currency,
    bankName: portAgent.bankName,
    bankAccount: portAgent.bankAccount,
    bankSwift: portAgent.bankSwift,
    serviceRating: portAgent.serviceRating,
    isPreferred: portAgent.isPreferred,
    notes: portAgent.notes,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/agency/port-agents/${portAgent.id}`)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Details
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Port Agent</h1>
        <p className="text-muted-foreground">
          Update {portAgent.agentName} ({portAgent.agentCode})
        </p>
      </div>

      {/* Form */}
      <PortAgentForm
        portAgent={formData}
        ports={ports}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
