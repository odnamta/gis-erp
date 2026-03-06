'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ScheduleForm } from '@/components/vessel-tracking/schedule-form';
import { ScheduleFormData, Vessel, Port } from '@/types/agency';
import { createSchedule, getVessels } from '@/app/actions/vessel-tracking-actions';
import { getPorts } from '@/app/actions/port-actions';
import { useToast } from '@/hooks/use-toast';

/**
 * New schedule form page.
 * Allows creating a new vessel schedule with voyage and port call details.
 * 
 * **Requirements: 2.1-2.5**
 */
export default function NewSchedulePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (document.cookie.includes('gama-explorer-mode=true')) {
      router.replace('/agency/schedules');
    }
  }, [router]);

  useEffect(() => {
    async function loadData() {
      try {
        const [vesselsData, portsResult] = await Promise.all([
          getVessels({ isActive: true }),
          getPorts(),
        ]);
        
        setVessels(vesselsData);
        if (portsResult.success && portsResult.data) {
          setPorts(portsResult.data);
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load vessels and ports',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [toast]);

  const handleSubmit = async (data: ScheduleFormData) => {
    setIsLoading(true);
    try {
      const result = await createSchedule(data);
      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: 'Schedule created successfully',
        });
        router.push(`/agency/schedules/${result.data.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create schedule',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/agency/schedules');
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          onClick={() => router.push('/agency/schedules')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Schedules
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add Schedule</h1>
        <p className="text-muted-foreground">
          Create a new vessel schedule / port call
        </p>
      </div>

      {/* Form */}
      <ScheduleForm
        vessels={vessels}
        ports={ports}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
