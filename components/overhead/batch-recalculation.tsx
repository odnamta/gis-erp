'use client';

// Batch Recalculation Component (v0.26)

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { batchRecalculateOverhead } from '@/app/(main)/job-orders/overhead-actions';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function BatchRecalculation() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number; error: string | null } | null>(null);
  const { toast } = useToast();

  // Generate year options (current year and 2 years back)
  const years = Array.from({ length: 3 }, (_, i) => {
    const y = currentDate.getFullYear() - i;
    return { value: y.toString(), label: y.toString() };
  });

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setLastResult(null);

    try {
      const result = await batchRecalculateOverhead(parseInt(year), parseInt(month));
      setLastResult(result);

      if (result.error) {
        toast({
          title: 'Partial Success',
          description: `Recalculated ${result.count} jobs. ${result.error}`,
          variant: 'destructive',
        });
      } else if (result.count === 0) {
        toast({
          title: 'No Jobs Found',
          description: `No job orders found for ${MONTHS[parseInt(month) - 1].label} ${year}.`,
        });
      } else {
        toast({
          title: 'Recalculation Complete',
          description: `Successfully recalculated overhead for ${result.count} job(s).`,
        });
      }
    } catch (_err) {
      toast({
        title: 'Error',
        description: 'Failed to recalculate overhead.',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Recalculation</CardTitle>
        <CardDescription>
          Recalculate overhead for all job orders in a specific period after changing rates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.value} value={y.value}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>

        {lastResult && lastResult.count > 0 && !lastResult.error && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>
              Successfully recalculated {lastResult.count} job order(s) for{' '}
              {MONTHS[parseInt(month) - 1].label} {year}.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
