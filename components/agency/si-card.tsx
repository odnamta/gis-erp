'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShippingInstructionStatusBadge } from './bl-status-badge';
import { ShippingInstruction, BL_TYPE_LABELS, FREIGHT_TERMS_LABELS } from '@/types/agency';
import { Ship, Package, Users, FileText, Eye, Edit, CreditCard, Calendar, CheckSquare } from 'lucide-react';
import Link from 'next/link';

interface SICardProps {
  si: ShippingInstruction;
}

/**
 * Summary card for Shipping Instruction list display.
 * Shows SI number, booking reference, shipper/consignee, status, and key details.
 * Per Requirement 2.1
 */
export function SICard({ si }: SICardProps) {
  const canEdit = si.status === 'draft';
  
  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg font-mono">{si.siNumber}</h3>
              <ShippingInstructionStatusBadge status={si.status} />
            </div>
            {si.booking && (
              <p className="text-sm text-muted-foreground mt-1">
                Booking: {si.booking.bookingNumber}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Link href={`/agency/si/${si.id}`}>
              <Button variant="ghost" size="icon" title="View details">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {canEdit && (
              <Link href={`/agency/si/${si.id}/edit`}>
                <Button variant="ghost" size="icon" title="Edit SI">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* B/L Type Requested */}
        {si.blTypeRequested && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Requested: {BL_TYPE_LABELS[si.blTypeRequested]}</span>
            {si.blTypeRequested === 'original' && si.originalsRequired && (
              <span className="text-muted-foreground">({si.originalsRequired} originals)</span>
            )}
          </div>
        )}

        {/* Shipper */}
        <div className="flex items-start gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{si.shipperName}</p>
            {si.consigneeToOrder ? (
              <p className="text-muted-foreground">
                {si.toOrderText || 'To Order'}
              </p>
            ) : si.consigneeName ? (
              <p className="text-muted-foreground truncate">→ {si.consigneeName}</p>
            ) : null}
          </div>
        </div>

        {/* Cargo Summary */}
        {(si.numberOfPackages || si.grossWeightKg) && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>
              {si.numberOfPackages && (
                <>
                  <span className="font-medium">{si.numberOfPackages.toLocaleString()}</span>
                  <span className="text-muted-foreground"> {si.packageType || 'pkgs'}</span>
                </>
              )}
              {si.numberOfPackages && si.grossWeightKg && ' | '}
              {si.grossWeightKg && (
                <>
                  <span className="font-medium">{si.grossWeightKg.toLocaleString()}</span>
                  <span className="text-muted-foreground"> kg</span>
                </>
              )}
              {si.measurementCbm && (
                <>
                  {' | '}
                  <span className="font-medium">{si.measurementCbm.toLocaleString()}</span>
                  <span className="text-muted-foreground"> CBM</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* Freight Terms */}
        {si.freightTerms && (
          <div className="flex items-center gap-2 text-sm">
            <Ship className="h-4 w-4 text-muted-foreground" />
            <span>Freight: {FREIGHT_TERMS_LABELS[si.freightTerms]}</span>
          </div>
        )}

        {/* LC Info */}
        {si.lcNumber && (
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>LC: {si.lcNumber}</span>
            {si.lcIssuingBank && (
              <span className="text-muted-foreground">({si.lcIssuingBank})</span>
            )}
          </div>
        )}

        {/* Documents Required */}
        {si.documentsRequired && si.documentsRequired.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span>
              {si.documentsRequired.length} document{si.documentsRequired.length !== 1 ? 's' : ''} required
            </span>
          </div>
        )}

        {/* Status Timestamps */}
        {(si.submittedAt || si.confirmedAt) && (
          <div className="pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {si.submittedAt && <span>Submitted: {formatDate(si.submittedAt)}</span>}
            {si.submittedAt && si.confirmedAt && ' | '}
            {si.confirmedAt && <span>Confirmed: {formatDate(si.confirmedAt)}</span>}
          </div>
        )}

        {/* Linked B/L */}
        {si.bl && (
          <div className="pt-2 border-t text-xs">
            <Link 
              href={`/agency/bl/${si.bl.id}`}
              className="text-primary hover:underline"
            >
              Linked B/L: {si.bl.blNumber}
            </Link>
          </div>
        )}

        {/* Created Date */}
        <div className="text-xs text-muted-foreground">
          Created: {formatDate(si.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
}
