'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface EmployeeOption {
  id: string;
  full_name: string;
  employee_code?: string;
}

interface EmployeeComboboxProps {
  /** List of employees to choose from */
  employees: EmployeeOption[];
  /** Currently selected employee ID */
  value: string;
  /** Callback when selection changes */
  onValueChange: (value: string) => void;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Whether to allow clearing the selection */
  allowClear?: boolean;
  /** Additional className for the trigger button */
  className?: string;
}

export function EmployeeCombobox({
  employees,
  value,
  onValueChange,
  placeholder = 'Cari karyawan...',
  disabled = false,
  allowClear = false,
  className,
}: EmployeeComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedEmployee = React.useMemo(
    () => employees.find((emp) => emp.id === value),
    [employees, value]
  );

  const getDisplayLabel = (emp: EmployeeOption) => {
    if (emp.employee_code) {
      return `${emp.employee_code} - ${emp.full_name}`;
    }
    return emp.full_name;
  };

  const getSearchableValue = (emp: EmployeeOption) => {
    // cmdk uses this for filtering — include both code and name
    return `${emp.employee_code || ''} ${emp.full_name}`.toLowerCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedEmployee ? getDisplayLabel(selectedEmployee) : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {allowClear && value && !disabled && (
              <X
                className="h-3.5 w-3.5 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange('');
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Ketik nama atau kode karyawan..." />
          <CommandList>
            <CommandEmpty>Karyawan tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={getSearchableValue(emp)}
                  onSelect={() => {
                    onValueChange(emp.id === value ? '' : emp.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === emp.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{emp.full_name}</span>
                    {emp.employee_code && (
                      <span className="text-xs text-muted-foreground truncate">
                        {emp.employee_code}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
