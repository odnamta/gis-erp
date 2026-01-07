'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrackingSearchResult,
  TRACKING_TYPE_LABELS,
} from '@/types/agency';
import { searchTracking } from '@/app/actions/vessel-tracking-actions';
import { Search, Loader2, Package, FileText, Ship, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingSearchProps {
  onSearchResult?: (result: TrackingSearchResult | null) => void;
  onSearchStart?: () => void;
  onSearchError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showResultPreview?: boolean;
}

/**
 * Search input for B/L, booking, or container tracking.
 * Auto-detects reference type based on input format.
 * 
 * **Requirements: 5.1, 5.2, 5.3**
 */
export function TrackingSearch({
  onSearchResult,
  onSearchStart,
  onSearchError,
  placeholder = 'Enter B/L number, booking number, or container number...',
  className,
  autoFocus = false,
  showResultPreview = true,
}: TrackingSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TrackingSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<'bl' | 'booking' | 'container' | null>(null);

  // Detect reference type from input
  const detectReferenceType = useCallback((input: string): 'bl' | 'booking' | 'container' | null => {
    if (!input?.trim()) return null;
    
    const trimmed = input.trim().toUpperCase();
    
    // Container number pattern: 4 letters + 7 digits (e.g., MSCU1234567)
    const containerPattern = /^[A-Z]{4}\d{7}$/;
    if (containerPattern.test(trimmed)) {
      return 'container';
    }
    
    // Booking number patterns: typically start with BK-, BOOK-, or similar
    const bookingPatterns = [/^BK[-\s]?/i, /^BOOK[-\s]?/i, /^FB[-\s]?/i];
    if (bookingPatterns.some(p => p.test(trimmed))) {
      return 'booking';
    }
    
    // B/L number patterns: typically contain BL, MBL, HBL, or have specific formats
    const blPatterns = [/^[HM]?BL[-\s]?/i, /^SNKO/i, /^COSU/i, /^MAEU/i, /^HLCU/i];
    if (blPatterns.some(p => p.test(trimmed))) {
      return 'bl';
    }
    
    // Default to B/L for other alphanumeric patterns
    if (/^[A-Z0-9]{6,}$/i.test(trimmed)) {
      return 'bl';
    }
    
    return null;
  }, []);

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    setError(null);
    setDetectedType(detectReferenceType(value));
  };

  // Handle search
  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a tracking reference');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResult(null);
    onSearchStart?.();

    try {
      const searchResult = await searchTracking(query.trim());
      
      if (searchResult) {
        setResult(searchResult);
        onSearchResult?.(searchResult);
      } else {
        setError('No tracking information found for this reference');
        onSearchResult?.(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      onSearchError?.(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle key press (Enter to search)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setDetectedType(null);
    onSearchResult?.(null);
  };

  // Get icon for detected type
  const getTypeIcon = () => {
    switch (detectedType) {
      case 'container':
        return <Package className="h-4 w-4" />;
      case 'booking':
        return <FileText className="h-4 w-4" />;
      case 'bl':
        return <Ship className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {getTypeIcon()}
          </div>
          <Input
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="pl-10 pr-10"
            autoFocus={autoFocus}
            disabled={isSearching}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleClear}
              disabled={isSearching}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-2">Track</span>
        </Button>
      </div>

      {/* Detected Type Indicator */}
      {detectedType && query && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Detected as:</span>
          <Badge variant="outline" className="capitalize">
            {(TRACKING_TYPE_LABELS as any)[detectedType] || detectedType}
          </Badge>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Preview */}
      {showResultPreview && result && (
        <TrackingSearchResultPreview result={result} />
      )}
    </div>
  );
}

/**
 * Preview component for search results
 */
interface TrackingSearchResultPreviewProps {
  result: TrackingSearchResult;
  className?: string;
}

export function TrackingSearchResultPreview({ result, className }: TrackingSearchResultPreviewProps) {
  return (
    <Card className={cn('bg-muted/50', className)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {result.type}
              </Badge>
              <span className="font-mono text-sm font-medium">{result.reference}</span>
            </div>
            
            {/* Booking Info */}
            {result.booking && (
              <p className="text-sm text-muted-foreground">
                Booking: {result.booking.bookingNumber}
              </p>
            )}
            
            {/* B/L Info */}
            {result.bl && (
              <p className="text-sm text-muted-foreground">
                B/L: {result.bl.blNumber}
              </p>
            )}
            
            {/* Vessel Info */}
            {result.vessel && (
              <p className="text-sm text-muted-foreground">
                Vessel: {result.vessel.name}
                {result.vessel.voyage && ` / ${result.vessel.voyage}`}
              </p>
            )}
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium">{result.events.length} events</p>
            {result.events.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Latest: {result.events[result.events.length - 1]?.eventType}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact search bar for header/toolbar use
 */
interface CompactTrackingSearchProps {
  onSearchResult?: (result: TrackingSearchResult | null) => void;
  className?: string;
}

export function CompactTrackingSearch({ onSearchResult, className }: CompactTrackingSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const result = await searchTracking(query.trim());
      onSearchResult?.(result);
    } catch {
      onSearchResult?.(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={cn('flex gap-1', className)}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="Track shipment..."
        className="h-8 w-48"
        disabled={isSearching}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleSearch}
        disabled={isSearching || !query.trim()}
      >
        {isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
