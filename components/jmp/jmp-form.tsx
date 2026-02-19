'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { JmpFormData, JourneyManagementPlan } from '@/types/jmp';
import { createJmp, updateJmp, createJmpFromSurvey } from '@/lib/jmp-actions';
import { Loader2 } from 'lucide-react';

interface JmpFormProps {
  jmp?: JourneyManagementPlan;
  surveys: { id: string; survey_number: string; cargo_description: string; origin_location: string; destination_location: string }[];
  customers: { id: string; name: string }[];
  employees: { id: string; full_name: string }[];
}

export function JmpForm({ jmp, surveys, customers, employees }: JmpFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('');

  const [formData, setFormData] = useState<JmpFormData>({
    journeyTitle: jmp?.journeyTitle || '',
    journeyDescription: jmp?.journeyDescription || '',
    cargoDescription: jmp?.cargoDescription || '',
    totalLengthM: jmp?.totalLengthM,
    totalWidthM: jmp?.totalWidthM,
    totalHeightM: jmp?.totalHeightM,
    totalWeightTons: jmp?.totalWeightTons,
    originLocation: jmp?.originLocation || '',
    destinationLocation: jmp?.destinationLocation || '',
    routeDistanceKm: jmp?.routeDistanceKm,
    plannedDeparture: jmp?.plannedDeparture?.slice(0, 16) || '',
    plannedArrival: jmp?.plannedArrival?.slice(0, 16) || '',
    journeyDurationHours: jmp?.journeyDurationHours,
    customerId: jmp?.customerId || '',
    convoyCommanderId: jmp?.convoyCommanderId || '',
    routeSurveyId: jmp?.routeSurveyId || '',
  });

  const handleSurveySelect = async (surveyId: string) => {
    if (!surveyId || surveyId === 'none') {
      setSelectedSurvey('');
      return;
    }
    
    setSelectedSurvey(surveyId);
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      setFormData(prev => ({
        ...prev,
        cargoDescription: survey.cargo_description,
        originLocation: survey.origin_location,
        destinationLocation: survey.destination_location,
        routeSurveyId: surveyId,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = jmp
        ? await updateJmp(jmp.id, formData)
        : await createJmp(formData);

      if (result.success) {
        toast({
          title: jmp ? 'JMP Updated' : 'JMP Created',
          description: `Journey Management Plan has been ${jmp ? 'updated' : 'created'} successfully.`,
        });
        router.push(`/engineering/jmp/${result.data?.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save JMP',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!jmp && surveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Create from Survey</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSurvey} onValueChange={handleSurveySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a completed survey (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No survey - Create from scratch</SelectItem>
                {surveys.map((survey) => (
                  <SelectItem key={survey.id} value={survey.id}>
                    {survey.survey_number} - {survey.cargo_description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Journey Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="journeyTitle">Journey Title *</Label>
              <Input
                id="journeyTitle"
                value={formData.journeyTitle}
                onChange={(e) => setFormData({ ...formData, journeyTitle: e.target.value })}
                placeholder="e.g., Heavy Crane Transport - Surabaya to Gresik"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="journeyDescription">Description</Label>
              <Textarea
                id="journeyDescription"
                value={formData.journeyDescription || ''}
                onChange={(e) => setFormData({ ...formData, journeyDescription: e.target.value })}
                placeholder="Brief description of the journey..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="customerId">Customer</Label>
              <Select
                value={formData.customerId || ''}
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="convoyCommanderId">Convoy Commander</Label>
              <Select
                value={formData.convoyCommanderId || ''}
                onValueChange={(value) => setFormData({ ...formData, convoyCommanderId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select convoy commander" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cargo Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cargoDescription">Cargo Description *</Label>
            <Textarea
              id="cargoDescription"
              value={formData.cargoDescription}
              onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
              placeholder="Describe the cargo being transported..."
              required
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="totalLengthM">Length (m)</Label>
              <Input
                id="totalLengthM"
                type="number"
                step="0.01"
                value={formData.totalLengthM ?? ''}
                onChange={(e) => setFormData({ ...formData, totalLengthM: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="totalWidthM">Width (m)</Label>
              <Input
                id="totalWidthM"
                type="number"
                step="0.01"
                value={formData.totalWidthM ?? ''}
                onChange={(e) => setFormData({ ...formData, totalWidthM: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="totalHeightM">Height (m)</Label>
              <Input
                id="totalHeightM"
                type="number"
                step="0.01"
                value={formData.totalHeightM ?? ''}
                onChange={(e) => setFormData({ ...formData, totalHeightM: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="totalWeightTons">Weight (tons)</Label>
              <Input
                id="totalWeightTons"
                type="number"
                step="0.01"
                value={formData.totalWeightTons ?? ''}
                onChange={(e) => setFormData({ ...formData, totalWeightTons: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Route & Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="originLocation">Origin *</Label>
              <Input
                id="originLocation"
                value={formData.originLocation}
                onChange={(e) => setFormData({ ...formData, originLocation: e.target.value })}
                placeholder="e.g., Tanjung Perak Port, Surabaya"
                required
              />
            </div>
            <div>
              <Label htmlFor="destinationLocation">Destination *</Label>
              <Input
                id="destinationLocation"
                value={formData.destinationLocation}
                onChange={(e) => setFormData({ ...formData, destinationLocation: e.target.value })}
                placeholder="e.g., PT. IKPT Estate, Gresik"
                required
              />
            </div>
            <div>
              <Label htmlFor="routeDistanceKm">Distance (km)</Label>
              <Input
                id="routeDistanceKm"
                type="number"
                step="0.1"
                value={formData.routeDistanceKm || ''}
                onChange={(e) => setFormData({ ...formData, routeDistanceKm: parseFloat(e.target.value) || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="journeyDurationHours">Duration (hours)</Label>
              <Input
                id="journeyDurationHours"
                type="number"
                step="0.5"
                value={formData.journeyDurationHours || ''}
                onChange={(e) => setFormData({ ...formData, journeyDurationHours: parseFloat(e.target.value) || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="plannedDeparture">Planned Departure</Label>
              <Input
                id="plannedDeparture"
                type="datetime-local"
                value={formData.plannedDeparture || ''}
                onChange={(e) => setFormData({ ...formData, plannedDeparture: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="plannedArrival">Planned Arrival</Label>
              <Input
                id="plannedArrival"
                type="datetime-local"
                value={formData.plannedArrival || ''}
                onChange={(e) => setFormData({ ...formData, plannedArrival: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {jmp ? 'Update JMP' : 'Create JMP'}
        </Button>
      </div>
    </form>
  );
}
