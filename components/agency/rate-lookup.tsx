'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookingContainer, ShippingRate, FreightCalculation, ContainerType } from '@/types/agency';
import { lookupRates, calculateFreight } from '@/app/actions/booking-actions';
import { formatCurrency } from '@/lib/booking-utils';
import { Search, DollarSign, Clock, Loader2 } from 'lucide-react';

interface RateLookupProps {
  originPortId: string;
  destinationPortId: string;
  shippingLineId?: string;
  containers: BookingContainer[];
  onRateSelect: (calculation: FreightCalculation) => void;
}

export function RateLookup({
  originPortId,
  destinationPortId,
  shippingLineId,
  containers,
  onRateSelect,
}: RateLookupProps) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [calculation, setCalculation] = useState<FreightCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerTypes = [...new Set(containers.map(c => c.containerType))];

  const handleLookup = async () => {
    if (!originPortId || !destinationPortId) {
      setError('Please select origin and destination ports');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const foundRates = await lookupRates({
        originPortId,
        destinationPortId,
        shippingLineId,
        containerTypes: containerTypes as ContainerType[],
      });

      setRates(foundRates);

      if (foundRates.length > 0 && containers.length > 0) {
        const calc = await calculateFreight(foundRates, containers);
        setCalculation(calc);
      } else {
        setCalculation(null);
      }
    } catch (err) {
      setError('Failed to lookup rates');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyRate = () => {
    if (calculation) {
      onRateSelect(calculation);
    }
  };

  const bestRate = rates.length > 0 ? rates[0] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Freight Rates</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLookup}
          disabled={isLoading || !originPortId || !destinationPortId}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Check Available Rates
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      {bestRate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Best Available Rate
              {bestRate.transitDays && (
                <span className="text-muted-foreground font-normal flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {bestRate.transitDays} days transit
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(bestRate.totalRate, bestRate.currency)} / {bestRate.containerType}
            </div>
            {bestRate.shippingLine && (
              <p className="text-sm text-muted-foreground mt-1">
                via {bestRate.shippingLine.lineName}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {calculation && calculation.containers.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Container</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculation.containers.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.containerType}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.ratePerUnit, calculation.currency)}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.subtotal, calculation.currency)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell colSpan={3}>Total Freight</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(calculation.totalFreight, calculation.currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleApplyRate}>
                Apply Rate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rates.length === 0 && !isLoading && !error && (
        <div className="text-center py-6 text-muted-foreground border rounded-lg">
          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Click &quot;Check Available Rates&quot; to find rates for this route</p>
        </div>
      )}

      {rates.length > 0 && containers.length === 0 && (
        <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
          Add containers to calculate total freight
        </div>
      )}
    </div>
  );
}
