'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, AlertTriangle, Loader2, ChevronDown, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { searchHSCodes, getHSCodeRates } from '@/lib/hs-utils';
import { logHSCodeSearch, getFrequentHSCodesAction } from '@/lib/hs-actions';
import type { HSCodeSearchResult, HSCode, HSCodeRates } from '@/types/hs-codes';

interface HSCodeDropdownProps {
  value?: string;
  onChange?: (hsCode: string, rates?: HSCodeRates) => void;
  onRatesChange?: (rates: HSCodeRates | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showRestrictionWarning?: boolean;
  error?: string;
}

export function HSCodeDropdown({
  value,
  onChange,
  onRatesChange,
  placeholder = 'Select HS code...',
  className,
  disabled = false,
  showRestrictionWarning = true,
  error,
}: HSCodeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HSCodeSearchResult[]>([]);
  const [frequentCodes, setFrequentCodes] = useState<HSCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<HSCodeSearchResult | HSCode | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load frequent codes on mount
  useEffect(() => {
    async function loadFrequent() {
      const result = await getFrequentHSCodesAction(5);
      if (result.success && result.data) {
        setFrequentCodes(result.data);
      }
    }
    loadFrequent();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        try {
          const searchResults = await searchHSCodes(query, 15);
          setResults(searchResults);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSelect = useCallback(async (code: HSCodeSearchResult | HSCode) => {
    setSelectedCode(code);
    setOpen(false);
    setQuery('');
    
    // Log search for history
    await logHSCodeSearch(query || code.hsCode, code.hsCode);
    
    // Get rates and notify parent
    const rates = await getHSCodeRates(code.hsCode);
    
    if (rates?.hasRestrictions && showRestrictionWarning) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
    
    onChange?.(code.hsCode, rates ?? undefined);
    onRatesChange?.(rates);
  }, [query, onChange, onRatesChange, showRestrictionWarning]);

  const handleClear = () => {
    setSelectedCode(null);
    setShowWarning(false);
    onChange?.('');
    onRatesChange?.(null);
  };

  const displayValue = selectedCode?.hsCode || value || '';
  const displayDescription = selectedCode?.description || '';

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !displayValue && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              {displayValue ? (
                <>
                  <span className="font-mono">{displayValue}</span>
                  {displayDescription && (
                    <span className="text-muted-foreground truncate">
                      - {displayDescription}
                    </span>
                  )}
                </>
              ) : (
                placeholder
              )}
            </div>
            <div className="flex items-center gap-1">
              {displayValue && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by code or description..."
                className="pl-8"
              />
              {isLoading && (
                <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
              )}
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-auto">
            {/* Frequent codes section */}
            {query.length < 2 && frequentCodes.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Clock className="h-3 w-3" />
                  <span>Recently Used</span>
                </div>
                {frequentCodes.map((code) => (
                  <HSCodeItem
                    key={code.id}
                    code={code}
                    onSelect={() => handleSelect(code)}
                  />
                ))}
              </div>
            )}
            
            {/* Search results */}
            {query.length >= 2 && results.length > 0 && (
              <div className="p-2">
                {results.map((result) => (
                  <HSCodeItem
                    key={result.id}
                    code={result}
                    onSelect={() => handleSelect(result)}
                  />
                ))}
              </div>
            )}
            
            {/* No results */}
            {query.length >= 2 && results.length === 0 && !isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No HS codes found
              </div>
            )}
            
            {/* Initial state */}
            {query.length < 2 && frequentCodes.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {showWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This HS code has import/export restrictions (Lartas). 
            Please ensure you have the required permits and documentation.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Helper component for HS code items
function HSCodeItem({
  code,
  onSelect,
}: {
  code: HSCode | HSCodeSearchResult;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-md p-2 text-left hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-sm">
              {code.hsCode}
            </span>
            {code.hasRestrictions && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Lartas
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {code.description}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground shrink-0">
          <div>MFN: {code.mfnRate}%</div>
        </div>
      </div>
    </button>
  );
}
