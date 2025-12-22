'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { BatchDepreciationResult } from '@/types/depreciation';
import { runMonthlyDepreciation } from '@/lib/depreciation-actions';

interface BatchDepreciationDialogProps {
  onComplete?: () => void;
}

const months = [
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

export function BatchDepreciationDialog({ onComplete }: BatchDepreciationDialogProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BatchDepreciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const handleProcess = async () => {
    setIsProcessing(true);
    setResult(null);
    setError(null);

    const response = await runMonthlyDepreciation(parseInt(year), parseInt(month));

    setIsProcessing(false);

    if (response.success && response.data) {
      setResult(response.data);
      onComplete?.();
    } else {
      setError(response.error || 'Failed to process depreciation');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Play className="mr-2 h-4 w-4" />
          Run Monthly Depreciation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Run Monthly Depreciation</DialogTitle>
          <DialogDescription>
            Process depreciation for all eligible assets for the selected month.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {result && (
            <Alert className={result.errorCount > 0 ? 'border-yellow-500' : 'border-green-500'}>
              {result.errorCount > 0 ? (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <p>Processed: {result.processedCount} assets</p>
                  <p>Skipped: {result.skippedCount} assets</p>
                  {result.errorCount > 0 && (
                    <p className="text-yellow-600">Errors: {result.errorCount}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleProcess} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing ? 'Processing...' : 'Run Depreciation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
