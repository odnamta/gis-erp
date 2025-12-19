'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Vendor, VendorType } from '@/types/vendors';
import { getVendorsByType, getActiveVendors } from '@/app/(main)/vendors/actions';
import {
  getVendorTypeLabel,
  formatRating,
  sortVendorsForDropdown,
  filterVendorsBySearch,
} from '@/lib/vendor-utils';

interface VendorSelectorProps {
  value?: string | null;
  onChange: (vendorId: string | null, vendor?: Vendor) => void;
  vendorType?: VendorType;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function VendorSelector({
  value,
  onChange,
  vendorType,
  placeholder = 'Select vendor...',
  disabled = false,
  className,
}: VendorSelectorProps) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load vendors on mount or when vendorType changes
  useEffect(() => {
    const loadVendors = async () => {
      setIsLoading(true);
      try {
        const result = vendorType
          ? await getVendorsByType(vendorType)
          : await getActiveVendors();
        
        if (result.data) {
          setVendors(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadVendors();
  }, [vendorType]);

  // Sort and filter vendors
  const sortedVendors = useMemo(() => {
    const sorted = sortVendorsForDropdown(vendors);
    return filterVendorsBySearch(sorted, searchQuery);
  }, [vendors, searchQuery]);

  // Separate preferred and other vendors
  const preferredVendors = sortedVendors.filter((v) => v.is_preferred);
  const otherVendors = sortedVendors.filter((v) => !v.is_preferred);

  // Find selected vendor
  const selectedVendor = vendors.find((v) => v.id === value);

  const handleSelect = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (value === vendorId) {
      onChange(null, undefined);
    } else {
      onChange(vendorId, vendor);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn('w-full justify-between', className)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : selectedVendor ? (
            <div className="flex items-center gap-2 truncate">
              {selectedVendor.is_preferred && (
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
              )}
              <span className="truncate">{selectedVendor.vendor_name}</span>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {selectedVendor.vendor_code}
              </Badge>
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
            placeholder="Search vendors..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Loading vendors...' : 'No vendors found.'}
            </CommandEmpty>

            {/* Preferred Vendors */}
            {preferredVendors.length > 0 && (
              <CommandGroup heading="Preferred Vendors">
                {preferredVendors.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.id}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === vendor.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span>{vendor.vendor_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {vendor.vendor_code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {vendor.average_rating && (
                          <span>★ {formatRating(vendor.average_rating)}</span>
                        )}
                        <span>{vendor.total_jobs} jobs</span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {preferredVendors.length > 0 && otherVendors.length > 0 && (
              <CommandSeparator />
            )}

            {/* Other Vendors */}
            {otherVendors.length > 0 && (
              <CommandGroup heading={preferredVendors.length > 0 ? 'Other Vendors' : 'Vendors'}>
                {otherVendors.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.id}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === vendor.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{vendor.vendor_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {vendor.vendor_code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {vendor.average_rating && (
                          <span>★ {formatRating(vendor.average_rating)}</span>
                        )}
                        <span>{vendor.total_jobs} jobs</span>
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
