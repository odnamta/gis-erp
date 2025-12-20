'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LeaveType, LeaveRequestFilters, LeaveRequestStatus } from '@/types/leave';
import { X } from 'lucide-react';

interface LeaveFiltersProps {
  filters: LeaveRequestFilters;
  onFiltersChange: (filters: LeaveRequestFilters) => void;
  leaveTypes: LeaveType[];
  employees?: { id: string; full_name: string }[];
  showEmployeeFilter?: boolean;
}

const statusOptions: { value: LeaveRequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function LeaveFilters({
  filters,
  onFiltersChange,
  leaveTypes,
  employees = [],
  showEmployeeFilter = false,
}: LeaveFiltersProps) {
  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : value as LeaveRequestStatus,
    });
  };

  const handleLeaveTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      leave_type_id: value === 'all' ? undefined : value,
    });
  };

  const handleEmployeeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      employee_id: value === 'all' ? undefined : value,
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      start_date: e.target.value || undefined,
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      end_date: e.target.value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {showEmployeeFilter && employees.length > 0 && (
        <div className="w-48">
          <Select
            value={filters.employee_id || 'all'}
            onValueChange={handleEmployeeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="w-40">
        <Select
          value={filters.leave_type_id || 'all'}
          onValueChange={handleLeaveTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {leaveTypes.map(type => (
              <SelectItem key={type.id} value={type.id}>
                {type.type_name.split(' ')[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-36">
        <Select
          value={filters.status || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          type="date"
          value={filters.start_date || ''}
          onChange={handleStartDateChange}
          className="w-36"
          placeholder="From"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="date"
          value={filters.end_date || ''}
          onChange={handleEndDateChange}
          className="w-36"
          placeholder="To"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
