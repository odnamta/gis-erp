'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Ship, Settings, Trophy, Calendar, ArrowRight } from 'lucide-react';
import {
  ShippingRate,
  ShippingLine,
  Port,
  CONTAINER_TYPES,
  ContainerType,
} from '@/types/agency';
import {
  getPorts,
  getShippingLines,
  searchShippingRates,
  findBestRate,
} from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';


export function ShippingRatesClient() {
  const router = useRouter();
  const { toast } = useToast();

  // Data state
  const [ports, setPorts] = useState<Port[]>([]);
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [searchResults, setSearchResults] = useState<ShippingRate[]>([]);
  const [bestRate, setBestRate] = useState<ShippingRate | null>(null);
  
  // Search state
  const [originPortId, setOriginPortId] = useState<string>('');
  const [destinationPortId, setDestinationPortId] = useState<string>('');
  const [containerType, setContainerType] = useState<string>('');
  const [shippingLineId, setShippingLineId] = useState<string>('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [portsResult, linesResult] = await Promise.all([
        getPorts(),
        getShippingLines(),
      ]);

      if (portsResult.success && portsResult.data) {
        setPorts(portsResult.data);
      }
      if (linesResult.success && linesResult.data) {
        setShippingLines(linesResult.data);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSearch = async () => {
    if (!originPortId || !destinationPortId) {
      toast({
        title: 'Validation Error',
        description: 'Please select both origin and destination ports',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setBestRate(null);

    try {
      const result = await searchShippingRates(
        originPortId,
        destinationPortId,
        containerType || undefined,
        shippingLineId || undefined
      );

      if (result.success && result.data) {
        setSearchResults(result.data);
        
        // Find best rate if container type is specified
        if (containerType && result.data.length > 0) {
          const bestResult = await findBestRate(originPortId, destinationPortId, containerType);
          if (bestResult.success && bestResult.data?.best) {
            setBestRate(bestResult.data.best);
          }
        } else if (result.data.length > 0) {
          // If no container type filter, the first result is the best
          setBestRate(result.data[0]);
        }
      } else {
        setSearchResults([]);
        toast({
          title: 'No Results',
          description: result.error || 'No rates found for this route',
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to search rates',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setOriginPortId('');
    setDestinationPortId('');
    setContainerType('');
    setShippingLineId('');
    setSearchResults([]);
    setBestRate(null);
    setHasSearched(false);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPortLabel = (portId: string) => {
    const port = ports.find(p => p.id === portId);
    return port ? `${port.portCode} - ${port.portName}` : portId;
  };

  const isRateExpiringSoon = (validTo: string) => {
    const expiryDate = new Date(validTo);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping Rates</h1>
          <p className="text-muted-foreground">
            Search and compare shipping rates between ports
          </p>
        </div>
        <Button onClick={() => router.push('/agency/shipping-rates/manage')}>
          <Settings className="mr-2 h-4 w-4" />
          Manage Rates
        </Button>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rate Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Origin Port */}
            <div className="space-y-2">
              <Label>Origin Port *</Label>
              <Select value={originPortId} onValueChange={setOriginPortId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select origin port" />
                </SelectTrigger>
                <SelectContent>
                  {ports.map((port) => (
                    <SelectItem key={port.id} value={port.id}>
                      {port.portCode} - {port.portName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination Port */}
            <div className="space-y-2">
              <Label>Destination Port *</Label>
              <Select value={destinationPortId} onValueChange={setDestinationPortId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination port" />
                </SelectTrigger>
                <SelectContent>
                  {ports.map((port) => (
                    <SelectItem key={port.id} value={port.id}>
                      {port.portCode} - {port.portName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Container Type */}
            <div className="space-y-2">
              <Label>Container Type</Label>
              <Select value={containerType} onValueChange={setContainerType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {CONTAINER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shipping Line */}
            <div className="space-y-2">
              <Label>Shipping Line</Label>
              <Select value={shippingLineId} onValueChange={setShippingLineId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="All lines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Lines</SelectItem>
                  {shippingLines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      {line.lineName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} disabled={loading || searching}>
              {searching ? (
                <>Searching...</>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Rates
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearSearch} disabled={searching}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Best Rate Highlight */}
      {bestRate && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Trophy className="h-5 w-5" />
              Best Rate Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {bestRate.shippingLine?.lineName || 'Unknown Line'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {bestRate.originPort?.portCode || 'N/A'}
                </span>
                <ArrowRight className="h-4 w-4" />
                <span className="text-muted-foreground">
                  {bestRate.destinationPort?.portCode || 'N/A'}
                </span>
              </div>
              <Badge variant="secondary">{bestRate.containerType}</Badge>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(bestRate.totalRate, bestRate.currency)}
              </div>
              {bestRate.transitDays && (
                <span className="text-sm text-muted-foreground">
                  {bestRate.transitDays} days transit
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>
              Search Results
              {searchResults.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({searchResults.length} rate{searchResults.length !== 1 ? 's' : ''} found)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ship className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rates found for this route.</p>
                <p className="text-sm mt-1">Try adjusting your search criteria or add new rates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipping Line</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Container</TableHead>
                      <TableHead className="text-right">Ocean Freight</TableHead>
                      <TableHead className="text-right">Surcharges</TableHead>
                      <TableHead className="text-right">Total Rate</TableHead>
                      <TableHead>Transit</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Terms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((rate, index) => {
                      const isBest = bestRate?.id === rate.id;
                      const surcharges = (rate.baf || 0) + (rate.caf || 0) + (rate.pss || 0) + (rate.ens || 0);
                      const expiringSoon = isRateExpiringSoon(rate.validTo);
                      
                      return (
                        <TableRow 
                          key={rate.id} 
                          className={isBest ? 'bg-green-50 dark:bg-green-950/20' : ''}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isBest && (
                                <Trophy className="h-4 w-4 text-green-600" />
                              )}
                              <span className="font-medium">
                                {rate.shippingLine?.lineName || 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <span>{rate.originPort?.portCode || 'N/A'}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{rate.destinationPort?.portCode || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{rate.containerType}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(rate.oceanFreight, rate.currency)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {surcharges > 0 ? `+${formatCurrency(surcharges, rate.currency)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(rate.totalRate, rate.currency)}
                          </TableCell>
                          <TableCell>
                            {rate.transitDays ? `${rate.transitDays} days` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className={expiringSoon ? 'text-orange-600' : ''}>
                                {format(new Date(rate.validTo), 'dd/MM/yyyy')}
                              </span>
                              {expiringSoon && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                                  Expiring
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{rate.terms}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!hasSearched && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Ship className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Search for Shipping Rates</h3>
              <p className="text-sm">
                Select origin and destination ports to find available rates.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
