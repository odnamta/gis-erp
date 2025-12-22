'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RateCalculator } from '@/components/hs-codes/rate-calculator';

export default function CalculatorPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customs/hs-codes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to HS Codes
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Import Duty Calculator</h1>
        <p className="text-muted-foreground">
          Calculate total import duties including BM, PPN, PPnBM, and PPh
        </p>
      </div>

      <div className="max-w-2xl">
        <RateCalculator />
      </div>
    </div>
  );
}
