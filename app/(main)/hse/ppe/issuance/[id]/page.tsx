'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PPEIssuance } from '@/types/ppe';
import { getPPEIssuanceById } from '@/lib/ppe-actions';
import {
  formatPPEDate,
  formatIssuanceStatus,
  getIssuanceStatusColor,
  formatCondition,
  isReplacementOverdue,
  isReplacementDueSoon,
  getDaysUntilReplacement,
} from '@/lib/ppe-utils';
import { InspectionForm } from '@/components/ppe/inspection-form';
import { InspectionHistory } from '@/components/ppe/inspection-history';
import { ReturnForm } from '@/components/ppe/return-form';
import {
  ArrowLeft,
  ClipboardCheck,
  RotateCcw,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';

export default function IssuanceDetailPage() {
  const params = useParams();
  const [issuance, setIssuance] = useState<PPEIssuance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);

  const loadIssuance = useCallback(async () => {
    try {
      const data = await getPPEIssuanceById(params.id as string);
      setIssuance(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadIssuance();
  }, [loadIssuance]);

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!issuance) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Issuance not found</h2>
          <p className="text-muted-foreground mt-2">
            The requested PPE issuance could not be found.
          </p>
          <Button asChild className="mt-4">
            <Link href="/hse/ppe/issuance">Back to Issuances</Link>
          </Button>
        </div>
      </div>
    );
  }

  const daysUntilReplacement = getDaysUntilReplacement(issuance.expected_replacement_date);
  const isOverdue = isReplacementOverdue(issuance.expected_replacement_date);
  const isDueSoon = isReplacementDueSoon(issuance.expected_replacement_date);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hse/ppe/issuance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">PPE Issuance Details</h1>
          <p className="text-muted-foreground">
            {issuance.ppe_type?.ppe_name} - {issuance.employee?.full_name}
          </p>
        </div>
        {issuance.status === 'active' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowInspectionForm(true)}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Record Inspection
            </Button>
            <Button variant="outline" onClick={() => setShowReturnForm(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Return / Replace
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issuance Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <Badge className={getIssuanceStatusColor(issuance.status)}>
                  {formatIssuanceStatus(issuance.status)}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">PPE Type</div>
                <div>{issuance.ppe_type?.ppe_name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Employee</div>
                <div>{issuance.employee?.full_name}</div>
                <div className="text-sm text-muted-foreground">
                  {issuance.employee?.employee_code}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Size</div>
                <div>{issuance.size || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Quantity</div>
                <div>{issuance.quantity}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Condition at Issue</div>
                <div>{formatCondition(issuance.condition_at_issue)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Issued Date</div>
                <div>{formatPPEDate(issuance.issued_date)}</div>
              </div>
              {issuance.serial_number && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Serial Number</div>
                  <div className="font-mono">{issuance.serial_number}</div>
                </div>
              )}
            </div>

            {issuance.expected_replacement_date && (
              <>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Replacement Schedule
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatPPEDate(issuance.expected_replacement_date)}</span>
                    {issuance.status === 'active' && isOverdue && (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {Math.abs(daysUntilReplacement!)} days overdue
                      </Badge>
                    )}
                    {issuance.status === 'active' && isDueSoon && !isOverdue && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                        <Clock className="mr-1 h-3 w-3" />
                        {daysUntilReplacement} days remaining
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}

            {issuance.returned_date && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Return Information</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Returned Date</div>
                      <div>{formatPPEDate(issuance.returned_date)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Returned Condition</div>
                      <div>{formatCondition(issuance.returned_condition || '')}</div>
                    </div>
                  </div>
                  {issuance.replacement_reason && (
                    <div>
                      <div className="text-sm text-muted-foreground">Reason</div>
                      <div>{issuance.replacement_reason}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            {issuance.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Notes</div>
                  <div className="text-sm">{issuance.notes}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inspection History</CardTitle>
            <CardDescription>
              Record of all inspections for this PPE item.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InspectionHistory inspections={issuance.inspections || []} />
          </CardContent>
        </Card>
      </div>

      <InspectionForm
        issuanceId={issuance.id}
        open={showInspectionForm}
        onOpenChange={setShowInspectionForm}
        onSuccess={() => {
          setShowInspectionForm(false);
          loadIssuance();
        }}
      />

      <ReturnForm
        issuance={issuance}
        open={showReturnForm}
        onOpenChange={setShowReturnForm}
        onSuccess={() => {
          setShowReturnForm(false);
          loadIssuance();
        }}
      />
    </div>
  );
}
