'use client';

// =====================================================
// v0.61: Period Selector Component
// =====================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PeriodType, DateRange } from '@/types/executive-dashboard';
import { validateDateRange } from '@/lib/executive-dashboard-utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface PeriodSelectorProps {
  value: PeriodType;
  onChange: (period: PeriodType, customRange?: DateRange) => void;
  allowCustom?: boolean;
  className?: string;
}

export function PeriodSelector({
  value,
  onChange,
  allowCustom = true,
  className,
}: PeriodSelectorProps) {
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePeriodChange = (newPeriod: string) => {
    if (newPeriod === 'custom') {
      setIsCustomOpen(true);
    } else {
      onChange(newPeriod as PeriodType);
    }
  };

  const handleCustomRangeSelect = (range: DateRange) => {
    const validation = validateDateRange(range);
    if (validation.valid) {
      setCustomRange(range);
      onChange('custom', range);
      setIsCustomOpen(false);
    }
  };

  const _periodLabels: Record<PeriodType, string> = {
    mtd: 'Month to Date',
    qtd: 'Quarter to Date',
    ytd: 'Year to Date',
    custom: 'Custom Range',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={value} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mtd">Month to Date</SelectItem>
          <SelectItem value="qtd">Quarter to Date</SelectItem>
          <SelectItem value="ytd">Year to Date</SelectItem>
          {allowCustom && <SelectItem value="custom">Custom Range</SelectItem>}
        </SelectContent>
      </Select>

      {value === 'custom' && customRange && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(customRange.start, 'MMM d, yyyy')} - {format(customRange.end, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Calendar
                  mode="single"
                  selected={customRange.start}
                  onSelect={(date) => date && setCustomRange({ ...customRange, start: date })}
                  initialFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Calendar
                  mode="single"
                  selected={customRange.end}
                  onSelect={(date) => date && handleCustomRangeSelect({ ...customRange, end: date })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default PeriodSelector;
