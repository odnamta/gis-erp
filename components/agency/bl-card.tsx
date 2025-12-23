'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BillOfLadingStatusBadge } from './bl-status-badge';
import { BillOfLading, BL_TYPE_LABELS } from '@/types/agency';
import { Ship, MapPin, FileText, Package, Eye, Edit, Printer, Calendar } from 'lucide-react';
import Link from 'next/link';

interface BLCardProps {
  bl: BillOfLading;
  onPrint?: (bl: BillOfLading) => void;
}

/**
 * Summary card for Bill of Lading list display.
 * Shows B/L number, booking reference, vessel, status, and key details.
 * Per Requirement 1.8
 */
export function BLCard({ bl, onPrint }: BLCardProps) {
  const canEdit = bl.status === 'draft' || bl.status === 'submitted';
  
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
              <h3 className="font-semibold text-lg font-mono">{bl.blNumber}</h3>
              <BillOfLadingStatusBadge status={bl.status} />
            </div>
            {bl.carrierBlNumber && (
              <p className="text-sm text-muted-foreground mt-1">
                Carrier: {bl.carrierBlNumber}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Link href={`/agency/bl/${bl.id}`}>
              <Button variant="ghost" size="icon" title="View details">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {canEdit && (
              <Link href={`/agency/bl/${bl.id}/edit`}>
                <Button variant="ghost" size="icon" title="Edit B/L">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {onPrint && (
              <Button 
                variant="ghost" 
                size="icon" 
                title="Print B/L"
                onClick={() => onPrint(bl)}
              >
                <Printer className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* B/L Type */}
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{BL_TYPE_LABELS[bl.blType]}</span>
          {bl.blType === 'original' && bl.originalCount && (
            <span className="text-muted-foreground">({bl.originalCount} originals)</span>
          )}
        </div>

        {/* Vessel & Voyage */}
        <div className="flex items-center gap-2 text-sm">
          <Ship className="h-4 w-4 text-muted-foreground" />
          <span>
            {bl.vesselName}
            {bl.voyageNumber && ` / ${bl.voyageNumber}`}
          </span>
        </div>

        {/* Route */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>
            {bl.portOfLoading} → {bl.portOfDischarge}
          </span>
        </div>

        {/* Shipper */}
        <div className="flex items-start gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{bl.shipperName}</p>
            {bl.consigneeToOrder ? (
              <p className="text-muted-foreground">To Order</p>
            ) : bl.consigneeName ? (
              <p className="text-muted-foreground truncate">→ {bl.consigneeName}</p>
            ) : null}
          </div>
        </div>

        {/* Dates */}
        {(bl.shippedOnBoardDate || bl.blDate) && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {bl.shippedOnBoardDate && `On Board: ${formatDate(bl.shippedOnBoardDate)}`}
              {bl.shippedOnBoardDate && bl.blDate && ' | '}
              {bl.blDate && `B/L Date: ${formatDate(bl.blDate)}`}
            </span>
          </div>
        )}

        {/* Cargo Summary */}
        {(bl.numberOfPackages || bl.grossWeightKg) && (
          <div className="pt-2 border-t flex items-center gap-4 text-sm">
            {bl.numberOfPackages && (
              <span>
                <span className="font-medium">{bl.numberOfPackages.toLocaleString()}</span>
                <span className="text-muted-foreground"> {bl.packageType || 'pkgs'}</span>
              </span>
            )}
            {bl.grossWeightKg && (
              <span>
                <span className="font-medium">{bl.grossWeightKg.toLocaleString()}</span>
                <span className="text-muted-foreground"> kg</span>
              </span>
            )}
            {bl.measurementCbm && (
              <span>
                <span className="font-medium">{bl.measurementCbm.toLocaleString()}</span>
                <span className="text-muted-foreground"> CBM</span>
              </span>
            )}
          </div>
        )}

        {/* Container Count */}
        {bl.containers && bl.containers.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {bl.containers.length} container{bl.containers.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Status Timestamps */}
        {(bl.issuedAt || bl.releasedAt) && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            {bl.issuedAt && <span>Issued: {formatDate(bl.issuedAt)}</span>}
            {bl.issuedAt && bl.releasedAt && ' | '}
            {bl.releasedAt && <span>Released: {formatDate(bl.releasedAt)}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
