'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FEE_CATEGORY_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/types/customs-fees';
import { Search, X } from 'lucide-react';

export function FeeFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [documentType, setDocumentType] = useState(searchParams.get('document_type') || '');
  const [feeCategory, setFeeCategory] = useState(searchParams.get('fee_category') || '');
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('payment_status') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (documentType) params.set('document_type', documentType);
    if (feeCategory) params.set('fee_category', feeCategory);
    if (paymentStatus) params.set('payment_status', paymentStatus);
    if (search) params.set('search', search);
    router.push(`/customs/fees?${params.toString()}`);
  };

  const clearFilters = () => {
    setDocumentType('');
    setFeeCategory('');
    setPaymentStatus('');
    setSearch('');
    router.push('/customs/fees');
  };

  const hasFilters = documentType || feeCategory || paymentStatus || search;

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>
      </div>

      <Select value={documentType} onValueChange={setDocumentType}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Doc Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="pib">PIB (Import)</SelectItem>
          <SelectItem value="peb">PEB (Export)</SelectItem>
        </SelectContent>
      </Select>

      <Select value={feeCategory} onValueChange={setFeeCategory}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {Object.entries(FEE_CATEGORY_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={applyFilters}>Apply</Button>

      {hasFilters && (
        <Button variant="ghost" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
