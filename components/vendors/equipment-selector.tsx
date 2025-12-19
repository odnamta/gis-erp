'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Loader2, AlertTriangle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { VendorEquipment, EquipmentType } from '@/types/vendors';
import { getAvailableEquipmentByType } from '@/app/(main)/vendors/equipment-actions';
import {
  getEquipmentTypeLabel,
  formatVendorCurrency,
  getDocumentExpiryStatus,
} from '@/lib/vendor-utils';

interface EquipmentSelectorProps {
  vendorId: string | null;
  value?: string | null;
  onChange: (equipmentId: string | null, equipment?: VendorEquipment) => void;
  equipmentType?: EquipmentType;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EquipmentSelector({
  vendorId,
  value,
  onChange,
  equipmentType,
  placeholder = 'Select equipment...',
  disabled = false,
  className,
}: EquipmentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [equipment, setEquipment] = useState<VendorEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load equipment when vendorId changes
  useEffect(() => {
    const loadEquipment = async () => {
      if (!vendorId) {
        setEquipment([]);
        return;
      }

      setIsLoading(true);
      try {
        const result = await getAvailableEquipmentByType(vendorId, equipmentType);
        if (result.data) {
          setEquipment(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadEquipment();
  }, [vendorId, equipmentType]);

  // Clear selection when vendor changes
  useEffect(() => {
    if (!vendorId && value) {
      onChange(null, undefined);
    }
  }, [vendorId, value, onChange]);

  // Filter equipment by search
  const filteredEquipment = useMemo(() => {
    if (!searchQuery.trim()) return equipment;
    const searchLower = searchQuery.toLowerCase();
    return equipment.filter(
      (eq) =>
        eq.plate_number?.toLowerCase().includes(searchLower) ||
        getEquipmentTypeLabel(eq.equipment_type).toLowerCase().includes(searchLower) ||
        eq.brand?.toLowerCase().includes(searchLower) ||
        eq.model?.toLowerCase().includes(searchLower)
    );
  }, [equipment, searchQuery]);

  // Find selected equipment
  const selectedEquipment = equipment.find((eq) => eq.id === value);

  // Check if equipment has document issues
  const hasDocumentIssues = (eq: VendorEquipment): boolean => {
    return (
      getDocumentExpiryStatus(eq.stnk_expiry) === 'expired' ||
      getDocumentExpiryStatus(eq.kir_expiry) === 'expired' ||
      getDocumentExpiryStatus(eq.insurance_expiry) === 'expired'
    );
  };

  const handleSelect = (equipmentId: string) => {
    const eq = equipment.find((e) => e.id === equipmentId);
    if (value === equipmentId) {
      onChange(null, undefined);
    } else {
      onChange(equipmentId, eq);
    }
    setOpen(false);
  };

  const isDisabled = disabled || !vendorId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled || isLoading}
          className={cn('w-full justify-between', className)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : !vendorId ? (
            'Select vendor first'
          ) : selectedEquipment ? (
            <div className="flex items-center gap-2 truncate">
              {hasDocumentIssues(selectedEquipment) && (
                <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
              )}
              <span className="truncate">
                {getEquipmentTypeLabel(selectedEquipment.equipment_type)}
                {selectedEquipment.plate_number && ` - ${selectedEquipment.plate_number}`}
              </span>
              {selectedEquipment.daily_rate && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {formatVendorCurrency(selectedEquipment.daily_rate)}/day
                </Badge>
              )}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search equipment..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading
                ? 'Loading equipment...'
                : equipment.length === 0
                ? 'No equipment available for this vendor.'
                : 'No equipment found.'}
            </CommandEmpty>

            {filteredEquipment.length > 0 && (
              <CommandGroup heading="Available Equipment">
                {filteredEquipment.map((eq) => (
                  <CommandItem
                    key={eq.id}
                    value={eq.id}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === eq.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-2">
                        {hasDocumentIssues(eq) && (
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                        )}
                        <div>
                          <span className="font-medium">
                            {getEquipmentTypeLabel(eq.equipment_type)}
                          </span>
                          {eq.plate_number && (
                            <span className="text-muted-foreground ml-1">
                              ({eq.plate_number})
                            </span>
                          )}
                          {eq.brand && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {eq.brand} {eq.model}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {eq.capacity_description ? (
                          <span className="text-muted-foreground">
                            {eq.capacity_description}
                          </span>
                        ) : eq.capacity_kg ? (
                          <span className="text-muted-foreground">
                            {eq.capacity_kg.toLocaleString()} kg
                          </span>
                        ) : null}
                        {eq.daily_rate && (
                          <Badge variant="secondary" className="text-xs">
                            {formatVendorCurrency(eq.daily_rate)}/day
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
