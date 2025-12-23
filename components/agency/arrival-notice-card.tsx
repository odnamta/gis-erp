'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrivalNoticeStatusBadge } from './bl-status-badge';
import { ArrivalNotice } from '@/types/agency';
import { 
  Ship, 
  MapPin, 
  Package, 
  Eye, 
  Edit, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Bell
} from 'lucide-react';
import Link from 'next/link';

interface ArrivalNoticeCardProps {
  notice: ArrivalNotice;
  onNotify?: (notice: ArrivalNotice) => void;
}

/**
 * Summary card for Arrival Notice list display.
 * Shows notice number, vessel, ETA, free time status, and key details.
 * Per Requirement 3.7
 */
export function ArrivalNoticeCard({ notice, onNotify }: ArrivalNoticeCardProps) {
  const canEdit = notice.status === 'pending';
  const canNotify = notice.status === 'pending' && !notice.consigneeNotified;
  
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

  // Calculate free time status
  const getFreeTimeStatus = () => {
    if (!notice.freeTimeExpires) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(notice.freeTimeExpires);
    expiryDate.setHours(0, 0, 0, 0);
    
    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      return {
        status: 'expired',
        label: `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: AlertTriangle,
      };
    } else if (daysRemaining === 0) {
      return {
        status: 'expiring',
        label: 'Expires today',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        icon: AlertTriangle,
      };
    } else if (daysRemaining <= 3) {
      return {
        status: 'warning',
        label: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        icon: Clock,
      };
    } else {
      return {
        status: 'ok',
        label: `${daysRemaining} days remaining`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: CheckCircle,
      };
    }
  };

  const freeTimeStatus = getFreeTimeStatus();

  // Calculate total estimated charges
  const getTotalCharges = () => {
    if (!notice.estimatedCharges || notice.estimatedCharges.length === 0) return null;
    return notice.estimatedCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  };

  const totalCharges = getTotalCharges();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg font-mono">{notice.noticeNumber}</h3>
              <ArrivalNoticeStatusBadge status={notice.status} />
            </div>
            {notice.bl && (
              <p className="text-sm text-muted-foreground mt-1">
                B/L: {notice.bl.blNumber}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Link href={`/agency/arrivals/${notice.id}`}>
              <Button variant="ghost" size="icon" title="View details">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {canEdit && (
              <Link href={`/agency/arrivals/${notice.id}/edit`}>
                <Button variant="ghost" size="icon" title="Edit notice">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {canNotify && onNotify && (
              <Button 
                variant="ghost" 
                size="icon" 
                title="Notify consignee"
                onClick={() => onNotify(notice)}
              >
                <Bell className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Vessel & Voyage */}
        <div className="flex items-center gap-2 text-sm">
          <Ship className="h-4 w-4 text-muted-foreground" />
          <span>
            {notice.vesselName}
            {notice.voyageNumber && ` / ${notice.voyageNumber}`}
          </span>
        </div>

        {/* Port & Terminal */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>
            {notice.portOfDischarge}
            {notice.terminal && ` - ${notice.terminal}`}
            {notice.berth && ` (${notice.berth})`}
          </span>
        </div>

        {/* ETA/ATA */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            ETA: {formatDate(notice.eta)}
            {notice.ata && ` | ATA: ${formatDate(notice.ata)}`}
          </span>
        </div>

        {/* Free Time Status */}
        {freeTimeStatus && (
          <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${freeTimeStatus.bgColor}`}>
            <freeTimeStatus.icon className={`h-4 w-4 ${freeTimeStatus.color}`} />
            <span className={freeTimeStatus.color}>
              Free time: {freeTimeStatus.label}
            </span>
            {notice.freeTimeExpires && (
              <span className="text-muted-foreground ml-auto text-xs">
                (Expires: {formatDate(notice.freeTimeExpires)})
              </span>
            )}
          </div>
        )}

        {/* Container Count */}
        {notice.containerNumbers && notice.containerNumbers.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>
              {notice.containerNumbers.length} container{notice.containerNumbers.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Estimated Charges */}
        {totalCharges !== null && totalCharges > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>
              Est. Charges: {totalCharges.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-muted-foreground">
              ({notice.estimatedCharges?.length} item{notice.estimatedCharges?.length !== 1 ? 's' : ''})
            </span>
          </div>
        )}

        {/* Status Timestamps */}
        {(notice.notifiedAt || notice.clearedAt || notice.deliveredAt) && (
          <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
            {notice.notifiedAt && (
              <div>Notified: {formatDate(notice.notifiedAt)}{notice.notifiedBy && ` by ${notice.notifiedBy}`}</div>
            )}
            {notice.clearedAt && (
              <div>Cleared: {formatDate(notice.clearedAt)}</div>
            )}
            {notice.deliveredAt && (
              <div>Delivered: {formatDate(notice.deliveredAt)}</div>
            )}
          </div>
        )}

        {/* Created Date */}
        <div className="text-xs text-muted-foreground">
          Created: {formatDate(notice.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
}
