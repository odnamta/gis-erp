'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeaveType, LeaveBalance } from '@/types/leave';
import { formatDays } from '@/lib/leave-utils';
import { Paperclip } from 'lucide-react';

interface LeaveTypeSelectProps {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function LeaveTypeSelect({
  leaveTypes,
  balances,
  value,
  onValueChange,
  disabled = false,
}: LeaveTypeSelectProps) {
  // Create a map of balances by leave type ID
  const balanceMap = new Map(balances.map(b => [b.leave_type_id, b]));

  const selectedType = leaveTypes.find(t => t.id === value);
  const selectedBalance = value ? balanceMap.get(value) : null;

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select leave type" />
        </SelectTrigger>
        <SelectContent>
          {leaveTypes.map(leaveType => {
            const balance = balanceMap.get(leaveType.id);
            const available = balance?.available_days ?? leaveType.default_days_per_year;
            
            return (
              <SelectItem 
                key={leaveType.id} 
                value={leaveType.id}
                disabled={available <= 0 && leaveType.default_days_per_year > 0}
              >
                <div className="flex items-center justify-between w-full gap-4">
                  <span className="flex items-center gap-2">
                    {leaveType.type_name}
                    {leaveType.requires_attachment && (
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                    )}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {leaveType.default_days_per_year === 0 
                      ? 'Unpaid' 
                      : `${formatDays(available)} available`}
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {selectedType && (
        <div className="text-sm text-muted-foreground">
          {selectedBalance ? (
            <span className="text-green-600 font-medium">
              Available: {formatDays(selectedBalance.available_days)}
            </span>
          ) : selectedType.default_days_per_year > 0 ? (
            <span>Default: {formatDays(selectedType.default_days_per_year)}</span>
          ) : (
            <span>Unpaid leave - no balance required</span>
          )}
          {selectedType.requires_attachment && (
            <span className="ml-2 text-yellow-600">
              • Attachment required
            </span>
          )}
          {selectedType.min_days_advance > 0 && (
            <span className="ml-2">
              • {selectedType.min_days_advance} days advance notice
            </span>
          )}
        </div>
      )}
    </div>
  );
}
