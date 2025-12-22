'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { searchHSCodes } from '@/lib/hs-utils';
import { logHSCodeSearch } from '@/lib/hs-actions';
import type { HSCodeSearchResult } from '@/types/hs-codes';

interface HSCodeSearchProps {
  onSelect?: (hsCode: HSCodeSearchResult) => void;
  placeholder?: string;
  className?: string;
  showRestrictionBadge?: boolean;
  limit?: number;
}

export function HSCodeSearch({
  onSelect,
  placeholder = 'Search HS codes by number or description...',
  className,
  showRestrictionBadge = true,
  limit = 20,
}: HSCodeSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HSCodeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        try {
          const searchResults = await searchHSCodes(query, limit);
          setResults(searchResults);
          setIsOpen(true);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, limit]);

  const handleSelect = useCallback(async (hsCode: HSCodeSearchResult) => {
    setQuery(hsCode.hsCode);
    setIsOpen(false);
    
    // Log search for history
    await logHSCodeSearch(query, hsCode.hsCode);
    
    onSelect?.(hsCode);
  }, [query, onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="max-h-[300px] overflow-auto py-1">
            {results.map((result, index) => (
              <li
                key={result.id}
                className={cn(
                  'cursor-pointer px-3 py-2 hover:bg-accent',
                  selectedIndex === index && 'bg-accent'
                )}
                onClick={() => handleSelect(result)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm">
                        {result.hsCode}
                      </span>
                      {showRestrictionBadge && result.hasRestrictions && (
                        <Badge variant="destructive" className="h-5 px-1.5">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Lartas
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {result.description}
                    </p>
                    {result.chapterName && (
                      <p className="text-xs text-muted-foreground/70 truncate">
                        Chapter: {result.chapterName}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>MFN: {result.mfnRate}%</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">
          No HS codes found for "{query}"
        </div>
      )}
    </div>
  );
}
