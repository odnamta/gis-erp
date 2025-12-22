'use client';

import { useState } from 'react';
import { Search, List, Calculator } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HSCodeSearch } from '@/components/hs-codes/hs-code-search';
import { HSCodeBrowser } from '@/components/hs-codes/hs-code-browser';
import { RateCalculator } from '@/components/hs-codes/rate-calculator';
import { FrequentCodesList } from '@/components/hs-codes/frequent-codes-list';
import { DutyBreakdown } from '@/components/hs-codes/duty-breakdown';
import { RestrictionBadge, getRestrictionType } from '@/components/hs-codes/restriction-badge';
import { calculateDuties } from '@/lib/hs-utils';
import type { HSCode, HSCodeSearchResult, DutyCalculation } from '@/types/hs-codes';

export default function HSCodesPage() {
  const [selectedCode, setSelectedCode] = useState<HSCode | HSCodeSearchResult | null>(null);
  const [calculation, setCalculation] = useState<DutyCalculation | null>(null);

  const handleCodeSelect = async (code: HSCode | HSCodeSearchResult) => {
    setSelectedCode(code);
    // Calculate duties with a sample CIF value for preview
    const calc = await calculateDuties(code.hsCode, 100000000); // 100 million IDR sample
    setCalculation(calc);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HS Code Database</h1>
        <p className="text-muted-foreground">
          Search and browse Harmonized System codes for customs classification
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-2">
            <List className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-2">
            <Calculator className="h-4 w-4" />
            Calculator
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Search HS Codes</CardTitle>
                  <CardDescription>
                    Search by HS code number or description in English/Indonesian
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HSCodeSearch
                    onSelect={handleCodeSelect}
                    limit={20}
                  />
                </CardContent>
              </Card>

              {/* Selected Code Details */}
              {selectedCode && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-mono text-xl">
                          {selectedCode.hsCode}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {selectedCode.description}
                        </CardDescription>
                      </div>
                      {getRestrictionType(
                        selectedCode.hasRestrictions,
                        selectedCode.hasExportRestrictions
                      ) && (
                        <RestrictionBadge
                          type={getRestrictionType(
                            selectedCode.hasRestrictions,
                            selectedCode.hasExportRestrictions
                          )!}
                          restrictionType={selectedCode.restrictionType}
                          issuingAuthority={selectedCode.issuingAuthority}
                          exportRestrictionType={selectedCode.exportRestrictionType}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">MFN Rate</p>
                        <p className="text-lg font-semibold">{selectedCode.mfnRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">PPN (VAT)</p>
                        <p className="text-lg font-semibold">{selectedCode.ppnRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">PPh Import</p>
                        <p className="text-lg font-semibold">{selectedCode.pphImportRate}%</p>
                      </div>
                      {selectedCode.ppnbmRate > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">PPnBM</p>
                          <p className="text-lg font-semibold">{selectedCode.ppnbmRate}%</p>
                        </div>
                      )}
                    </div>
                    {selectedCode.descriptionId && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Indonesian Description</p>
                        <p className="text-sm">{selectedCode.descriptionId}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Sample Calculation */}
              {calculation && (
                <DutyBreakdown calculation={calculation} />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recently Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <FrequentCodesList
                    onSelect={handleCodeSelect}
                    limit={5}
                    showTitle={false}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse">
          <Card>
            <CardHeader>
              <CardTitle>Browse by Chapter</CardTitle>
              <CardDescription>
                Navigate through HS code chapters and headings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HSCodeBrowser onSelect={handleCodeSelect} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator">
          <div className="max-w-2xl">
            <RateCalculator />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
