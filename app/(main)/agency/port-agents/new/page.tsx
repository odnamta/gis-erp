'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PortAgentForm } from '@/components/agency/port-agent-form';
import { PortAgentFormData, Port } from '@/types/agency';
import { createPortAgent, getPorts } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

export default function NewPortAgentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [ports, setPorts] = useState<Port[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(true);

  useEffect(() => {
    async function loadPorts() {
      const result = await getPorts();
      if (result.success && result.data) {
        setPorts(result.data);
      }
      setLoadingPorts(false);
    }
    loadPorts();
  }, []);

  const handleSubmit = async (data: PortAgentFormData) => {
    setIsLoading(true);
    try {
      const result = await createPortAgent(data);
      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: 'Port agent created successfully',
        });
        router.push(`/agency/port-agents/${result.data.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create port agent',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating port agent:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingPorts) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/agency/port-agents')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Port Agents
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add Port Agent</h1>
        <p className="text-muted-foreground">
          Create a new port agent record
        </p>
      </div>

      {/* Form */}
      <PortAgentForm
        ports={ports}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
