'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentDialog } from './payment-dialog';
import { formatFeeAmount, getFeeCategoryVariant } from '@/lib/fee-utils';
import {
  CustomsFeeWithRelations,
  FEE_CATEGORY_LABELS,
} from '@/types/customs-fees';
import { format } from 'date-fns';
import { CreditCard, Building2 } from 'lucide-react';

interface PendingPaymentsListProps {
  fees: CustomsFeeWithRelations[];
}

export function PendingPaymentsList({ fees }: PendingPaymentsListProps) {
  const _router = useRouter();
  const [selectedFee, setSelectedFee] = useState<CustomsFeeWithRelations | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const getDocumentRef = (fee: CustomsFeeWithRelations) => {
    if (fee.document_type === 'pib' && fee.pib) {
      return fee.pib.internal_ref;
    }
    if (fee.document_type === 'peb' && fee.peb) {
      return fee.peb.internal_ref;
    }
    return '-';
  };

  // Calculate totals
  const totalPending = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const governmentFees = fees.filter(f => f.fee_type?.is_government_fee);
  const serviceFees = fees.filter(f => !f.fee_type?.is_government_fee);

  if (fees.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No pending payments. All fees have been settled.
      </div>
    );
  }

  return (
    <>
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Pending</p>
          <p className="text-2xl font-bold text-red-600">
            {formatFeeAmount(totalPending, 'IDR')}
          </p>
          <p className="text-xs text-muted-foreground">{fees.length} fees</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-blue-500" />
            <p className="text-sm text-muted-foreground">Government Fees</p>
          </div>
          <p className="text-xl font-bold">
            {formatFeeAmount(governmentFees.reduce((s, f) => s + f.amount, 0), 'IDR')}
          </p>
          <p className="text-xs text-muted-foreground">{governmentFees.length} fees</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-green-500" />
            <p className="text-sm text-muted-foreground">Service Fees</p>
          </div>
          <p className="text-xl font-bold">
            {formatFeeAmount(serviceFees.reduce((s, f) => s + f.amount, 0), 'IDR')}
          </p>
          <p className="text-xs text-muted-foreground">{serviceFees.length} fees</p>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fee Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Job Order</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fees.map((fee) => (
            <TableRow key={fee.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {fee.fee_type?.is_government_fee && (
                    <Building2 className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="font-medium">{fee.fee_type?.fee_name || '-'}</span>
                </div>
              </TableCell>
              <TableCell>
                {fee.fee_type && (
                  <Badge variant={getFeeCategoryVariant(fee.fee_type.fee_category)}>
                    {FEE_CATEGORY_LABELS[fee.fee_type.fee_category]}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="uppercase">
                  {fee.document_type}
                </Badge>
                <span className="ml-2 text-sm">{getDocumentRef(fee)}</span>
              </TableCell>
              <TableCell>{fee.job_order?.jo_number || '-'}</TableCell>
              <TableCell className="text-right font-bold">
                {formatFeeAmount(fee.amount, fee.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(fee.created_at), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedFee(fee);
                    setShowPaymentDialog(true);
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Payment Dialog */}
      {selectedFee && (
        <PaymentDialog
          fee={selectedFee}
          open={showPaymentDialog}
          onOpenChange={(open: boolean) => {
            setShowPaymentDialog(open);
            if (!open) setSelectedFee(null);
          }}
        />
      )}
    </>
  );
}
