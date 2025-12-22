'use client';

import { useState } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HSCodeDropdown } from './hs-code-dropdown';
import { DutyBreakdown } from './duty-breakdown';
import { calculateDuties, getPreferentialRates } from '@/lib/hs-utils';
import { FTA_CODES, FTA_NAMES } from '@/types/hs-codes';
import type { DutyCalculation, FTACode, HSPreferentialRate } from '@/types/hs-codes';

interface RateCalculatorProps {
  className?: string;
}

export function RateCalculator({ className }: RateCalculatorProps) {
  const [hsCode, setHsCode] = useState('');
  const [cifValue, setCifValue] = useState('');
  const [selectedFta, setSelectedFta] = useState<FTACode | ''>('');
  const [availableFtas, setAvailableFtas] = useState<HSPreferentialRate[]>([]);
  const [calculation, setCalculation] = useState<DutyCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');

  const handleHsCodeChange = async (code: string) => {
    setHsCode(code);
    setSelectedFta('');
    setCalculation(null);
    setError('');
    
    if (code) {
      // Load available preferential rates
      const rates = await getPreferentialRates(code);
      setAvailableFtas(rates);
    } else {
      setAvailableFtas([]);
    }
  };

  const handleCalculate = async () => {
    if (!hsCode) {
      setError('Please select an HS code');
      return;
    }
    
    const cif = parseFloat(cifValue);
    if (isNaN(cif) || cif <= 0) {
      setError('Please enter a valid CIF value');
      return;
    }
    
    setIsCalculating(true);
    setError('');
    
    try {
      const result = await calculateDuties(
        hsCode,
        cif,
        selectedFta || undefined
      );
      
      if (result) {
        setCalculation(result);
      } else {
        setError('Could not calculate duties. Please check the HS code.');
      }
    } catch (err) {
      console.error('Calculation error:', err);
      setError('An error occurred while calculating duties');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    setHsCode('');
    setCifValue('');
    setSelectedFta('');
    setAvailableFtas([]);
    setCalculation(null);
    setError('');
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Import Duty Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* HS Code Selection */}
          <div className="space-y-2">
            <Label htmlFor="hs-code">HS Code</Label>
            <HSCodeDropdown
              value={hsCode}
              onChange={handleHsCodeChange}
              placeholder="Search and select HS code..."
            />
          </div>
          
          {/* CIF Value */}
          <div className="space-y-2">
            <Label htmlFor="cif-value">CIF Value (IDR)</Label>
            <Input
              id="cif-value"
              type="number"
              min="0"
              step="1000"
              value={cifValue}
              onChange={(e) => setCifValue(e.target.value)}
              placeholder="Enter CIF value in IDR"
            />
          </div>
          
          {/* FTA Selection */}
          <div className="space-y-2">
            <Label htmlFor="fta">
              Preferential Rate (FTA)
              <span className="text-muted-foreground font-normal ml-1">
                - Optional
              </span>
            </Label>
            <Select
              value={selectedFta}
              onValueChange={(value) => setSelectedFta(value as FTACode | '')}
              disabled={availableFtas.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  availableFtas.length === 0
                    ? 'No preferential rates available'
                    : 'Select FTA for preferential rate'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Use MFN Rate</SelectItem>
                {availableFtas.map((rate) => (
                  <SelectItem key={rate.ftaCode} value={rate.ftaCode}>
                    {FTA_NAMES[rate.ftaCode]} ({rate.preferentialRate}%)
                    {rate.requiresCoo && ' - COO Required'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableFtas.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {availableFtas.length} preferential rate(s) available for this HS code
              </p>
            )}
          </div>
          
          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCalculate}
              disabled={isCalculating || !hsCode || !cifValue}
              className="flex-1"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Duties
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Results */}
      {calculation && (
        <DutyBreakdown calculation={calculation} className="mt-4" />
      )}
    </div>
  );
}
