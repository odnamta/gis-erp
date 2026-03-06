'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ScheduleForm } from '@/components/vessel-tracking/schedule-form';
import { VesselSchedule, ScheduleFormData, Vessel, Port } from '@/types/agency';
import { updateSchedule } from '@/app/actions/vessel-tracking-actions';
import { useToast } from '@/hooks/use-toast';

interface EditScheduleClientProps {
  schedule: VesselSchedule;
  vessels: Vessel[];
  ports: Port[];
}

/**
 * Edit schedule form page client component.
 * Allows updating schedule information including times and cutoffs.
 * 
 * **Requirements: 2.1-2.5**
 */
export function EditScheduleClient({ schedule, vessels, ports }: EditScheduleClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ScheduleFormData) => {
    setIsLoading(true);
    try {
      const result = await updateSchedule(schedule.id, data);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Schedule updated successfully',
        });
        router.push(`/agency/schedules/${schedule.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update schedule',
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
    router.push(`/agency/schedules/${schedule.id}`);
  };

  // Convert VesselSchedule to ScheduleFormData
  const formData: ScheduleFormData = {
    vesselId: schedule.vesselId,
    voyageNumber: schedule.voyageNumber,
    serviceName: schedule.serviceName,
    serviceCode: schedule.serviceCode,
    scheduleType: schedule.scheduleType,
    portId: schedule.portId,
    portName: schedule.portName,
    terminal: schedule.terminal,
    berth: schedule.berth,
    scheduledArrival: schedule.scheduledArrival,
    scheduledDeparture: schedule.scheduledDeparture,
    actualArrival: schedule.actualArrival,
    actualDeparture: schedule.actualDeparture,
    cargoCutoff: schedule.cargoCutoff,
    docCutoff: schedule.docCutoff,
    vgmCutoff: schedule.vgmCutoff,
    status: schedule.status,
    delayReason: schedule.delayReason,
    notes: schedule.notes,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/agency/schedules/${schedule.id}`)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Details
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Schedule</h1>
        <p className="text-muted-foreground">
          Update schedule for {schedule.portName}
          {schedule.vessel?.vesselName && ` - ${schedule.vessel.vesselName}`}
          {schedule.voyageNumber && ` (Voyage: ${schedule.voyageNumber})`}
        </p>
      </div>

      {/* Form */}
      <ScheduleForm
        initialData={formData}
        vessels={vessels}
        ports={ports}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
