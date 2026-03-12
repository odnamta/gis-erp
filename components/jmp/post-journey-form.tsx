'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { PostJourneyData, JourneyManagementPlan } from '@/types/jmp';
import { completeJourney } from '@/lib/jmp-actions';
import { calculateTimeVariance } from '@/lib/jmp-utils';

interface PostJourneyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jmp: JourneyManagementPlan;
  onComplete: () => void;
}

export function PostJourneyForm({ open, onOpenChange, jmp, onComplete }: PostJourneyFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PostJourneyData>({
    journeyLog: '',
    incidentsOccurred: false,
    incidentSummary: '',
    lessonsLearned: '',
  });

  const timeVariance = jmp.plannedArrival && jmp.actualDeparture
    ? calculateTimeVariance(jmp.plannedArrival, new Date().toISOString())
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.incidentsOccurred && !formData.incidentSummary?.trim()) {
      toast({
        title: 'Error',
        description: 'Incident summary is required when incidents occurred',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const result = await completeJourney(jmp.id, formData);
    setLoading(false);

    if (result.success) {
      toast({ title: 'Journey completed successfully' });
      onOpenChange(false);
      onComplete();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Journey</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {timeVariance !== null && (
            <Card className={timeVariance > 0 ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'}>
              <CardContent className="py-3">
                <p className="text-sm">
                  Time Variance:{' '}
                  <span className="font-semibold">
                    {timeVariance > 0 ? '+' : ''}{timeVariance} minutes
                  </span>
                  {timeVariance > 0 ? ' (behind schedule)' : ' (ahead of schedule)'}
                </p>
              </CardContent>
            </Card>
          )}

          <div>
            <Label htmlFor="journeyLog">Journey Log</Label>
            <Textarea
              id="journeyLog"
              value={formData.journeyLog || ''}
              onChange={(e) => setFormData({ ...formData, journeyLog: e.target.value })}
              placeholder="Summary of the journey..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="incidentsOccurred"
              checked={formData.incidentsOccurred}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, incidentsOccurred: !!checked })
              }
            />
            <Label htmlFor="incidentsOccurred">Incidents Occurred</Label>
          </div>

          {formData.incidentsOccurred && (
            <div>
              <Label htmlFor="incidentSummary">Incident Summary *</Label>
              <Textarea
                id="incidentSummary"
                value={formData.incidentSummary || ''}
                onChange={(e) => setFormData({ ...formData, incidentSummary: e.target.value })}
                placeholder="Describe any incidents that occurred..."
                rows={3}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="lessonsLearned">Lessons Learned</Label>
            <Textarea
              id="lessonsLearned"
              value={formData.lessonsLearned || ''}
              onChange={(e) => setFormData({ ...formData, lessonsLearned: e.target.value })}
              placeholder="Any lessons learned for future journeys..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Journey
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
