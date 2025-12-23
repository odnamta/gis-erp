'use client';

import { Badge } from '@/components/ui/badge';
import {
  BLStatus,
  BL_STATUS_LABELS,
  BL_STATUS_COLORS,
  SIStatus,
  SI_STATUS_LABELS,
  SI_STATUS_COLORS,
  ArrivalNoticeStatus,
  ARRIVAL_NOTICE_STATUS_LABELS,
  ARRIVAL_NOTICE_STATUS_COLORS,
  ManifestStatus,
  MANIFEST_STATUS_LABELS,
  MANIFEST_STATUS_COLORS,
} from '@/types/agency';

// Document type discriminator
type DocumentType = 'bl' | 'si' | 'arrival_notice' | 'manifest';

// Union type for all status types
type DocumentStatus = BLStatus | SIStatus | ArrivalNoticeStatus | ManifestStatus;

interface BLStatusBadgeProps {
  status: DocumentStatus;
  documentType?: DocumentType;
  className?: string;
}

/**
 * Status badge component for B/L documentation module.
 * Supports all document types: Bill of Lading, Shipping Instruction, Arrival Notice, and Cargo Manifest.
 * 
 * @param status - The status value
 * @param documentType - Optional document type to ensure correct label/color mapping
 * @param className - Optional additional CSS classes
 */
export function BLStatusBadge({ status, documentType, className }: BLStatusBadgeProps) {
  const { label, colorClass } = getStatusDisplay(status, documentType);

  return (
    <Badge variant="outline" className={`${colorClass} ${className || ''}`}>
      {label}
    </Badge>
  );
}

/**
 * Get the display label and color class for a status.
 * Auto-detects document type based on status value if not provided.
 */
function getStatusDisplay(
  status: DocumentStatus,
  documentType?: DocumentType
): { label: string; colorClass: string } {
  // If document type is explicitly provided, use it
  if (documentType) {
    return getStatusByDocumentType(status, documentType);
  }

  // Auto-detect based on status value
  // Check B/L statuses (unique: 'issued', 'released', 'surrendered')
  if (status in BL_STATUS_LABELS) {
    const blStatus = status as BLStatus;
    return {
      label: BL_STATUS_LABELS[blStatus],
      colorClass: BL_STATUS_COLORS[blStatus],
    };
  }

  // Check Arrival Notice statuses (unique: 'pending', 'notified', 'cleared', 'delivered')
  if (status in ARRIVAL_NOTICE_STATUS_LABELS) {
    const anStatus = status as ArrivalNoticeStatus;
    return {
      label: ARRIVAL_NOTICE_STATUS_LABELS[anStatus],
      colorClass: ARRIVAL_NOTICE_STATUS_COLORS[anStatus],
    };
  }

  // Check Manifest statuses (unique: 'approved')
  if (status in MANIFEST_STATUS_LABELS) {
    const manifestStatus = status as ManifestStatus;
    return {
      label: MANIFEST_STATUS_LABELS[manifestStatus],
      colorClass: MANIFEST_STATUS_COLORS[manifestStatus],
    };
  }

  // Check SI statuses (shares 'draft', 'submitted', 'confirmed', 'amended' with others)
  if (status in SI_STATUS_LABELS) {
    const siStatus = status as SIStatus;
    return {
      label: SI_STATUS_LABELS[siStatus],
      colorClass: SI_STATUS_COLORS[siStatus],
    };
  }

  // Fallback for unknown status
  return {
    label: status,
    colorClass: 'bg-gray-100 text-gray-800',
  };
}

/**
 * Get status display by explicit document type
 */
function getStatusByDocumentType(
  status: DocumentStatus,
  documentType: DocumentType
): { label: string; colorClass: string } {
  switch (documentType) {
    case 'bl':
      return {
        label: BL_STATUS_LABELS[status as BLStatus] || status,
        colorClass: BL_STATUS_COLORS[status as BLStatus] || 'bg-gray-100 text-gray-800',
      };
    case 'si':
      return {
        label: SI_STATUS_LABELS[status as SIStatus] || status,
        colorClass: SI_STATUS_COLORS[status as SIStatus] || 'bg-gray-100 text-gray-800',
      };
    case 'arrival_notice':
      return {
        label: ARRIVAL_NOTICE_STATUS_LABELS[status as ArrivalNoticeStatus] || status,
        colorClass: ARRIVAL_NOTICE_STATUS_COLORS[status as ArrivalNoticeStatus] || 'bg-gray-100 text-gray-800',
      };
    case 'manifest':
      return {
        label: MANIFEST_STATUS_LABELS[status as ManifestStatus] || status,
        colorClass: MANIFEST_STATUS_COLORS[status as ManifestStatus] || 'bg-gray-100 text-gray-800',
      };
    default:
      return {
        label: status,
        colorClass: 'bg-gray-100 text-gray-800',
      };
  }
}

// Export individual badge components for convenience
export function BillOfLadingStatusBadge({ 
  status, 
  className 
}: { 
  status: BLStatus; 
  className?: string 
}) {
  return <BLStatusBadge status={status} documentType="bl" className={className} />;
}

export function ShippingInstructionStatusBadge({ 
  status, 
  className 
}: { 
  status: SIStatus; 
  className?: string 
}) {
  return <BLStatusBadge status={status} documentType="si" className={className} />;
}

export function ArrivalNoticeStatusBadge({ 
  status, 
  className 
}: { 
  status: ArrivalNoticeStatus; 
  className?: string 
}) {
  return <BLStatusBadge status={status} documentType="arrival_notice" className={className} />;
}

export function ManifestStatusBadge({ 
  status, 
  className 
}: { 
  status: ManifestStatus; 
  className?: string 
}) {
  return <BLStatusBadge status={status} documentType="manifest" className={className} />;
}
