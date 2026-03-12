'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PaymentDialog } from './payment-dialog';
import { getFeesByDocument } from '@/lib/fee-actions';
import { formatFeeAmount, getPaymentStatusVariant, getFeeCategoryVariant } from '@/lib/fee-utils';
import {
  CustomsFeeWithRelations,
  CustomsDocumentType,
  PAYMENT_STATUS_LABELS,
  FEE_CATEGORY_LABELS,
} from '@/types/customs-fees';
import { format } from 'date-fns';
import { Plus, CreditCard, Receipt, Loader2 } from 'lucide-react';

interface DocumentFeesSectionProps {
  documentType: CustomsDocumentType;
  documentId: string;
  editable?: boolean;
}

export function DocumentFeesSection({
  documentType,
  documentId,
  editable = true,
}: DocumentFeesSectionProps) {
  const _router = useRouter();
  const [fees, setFees] = useState<CustomsFeeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFee, setSelectedFee] = useState<CustomsFeeWithRelations | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const loadFees = async () => {
    setLoading(true);
    const data = await getFeesByDocument(documentType, documentId);
    setFees(data);
    setLoading(false);
  };

  useEffect(() => {
    loadFees();
  }, [documentType, documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate totals
  const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidAmount = fees
    .filter((f) => f.payment_status === 'paid')
    .reduce((sum, fee) => sum + fee.amount, 0);
  const pendingAmount = fees
    .filter((f) => f.payment_status === 'pending')
    .reduce((sum, fee) => sum + fee.amount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFeeAmount(totalAmount, 'IDR')}</div>
            <p className="text-xs text-muted-foreground">{fees.length} fees recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatFeeAmount(paidAmount, 'IDR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatFeeAmount(pendingAmount, 'IDR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fees Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Fees & Duties
          </CardTitle>
          {editable && (
            <Button asChild size="sm">
              <Link
                href={`/customs/fees/new?document_type=${documentType}&document_id=${documentId}`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Fee
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fees recorded for this document.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">
                      {fee.fee_type?.fee_name || '-'}
                    </TableCell>
                    <TableCell>
                      {fee.fee_type && (
                        <Badge variant={getFeeCategoryVariant(fee.fee_type.fee_category)}>
                          {FEE_CATEGORY_LABELS[fee.fee_type.fee_category]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatFeeAmount(fee.amount, fee.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusVariant(fee.payment_status)}>
                        {PAYMENT_STATUS_LABELS[fee.payment_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(fee.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {fee.payment_status === 'pending' && editable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFee(fee);
                            setShowPaymentDialog(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {selectedFee && (
        <PaymentDialog
          fee={selectedFee}
          open={showPaymentDialog}
          onOpenChange={(open: boolean) => {
            setShowPaymentDialog(open);
            if (!open) {
              setSelectedFee(null);
              loadFees();
            }
          }}
        />
      )}
    </div>
  );
}
