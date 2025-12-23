'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ManifestStatusBadge } from './bl-status-badge';
import { CargoManifest, MANIFEST_TYPE_LABELS } from '@/types/agency';
import { 
  Ship, 
  MapPin, 
  Package, 
  Eye, 
  Edit, 
  Calendar, 
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Send
} from 'lucide-react';
import Link from 'next/link';

interface ManifestCardProps {
  manifest: CargoManifest;
  onSubmit?: (manifest: CargoManifest) => void;
}

/**
 * Summary card for Cargo Manifest list display.
 * Shows manifest number, vessel, type, totals, and status.
 * Per Requirement 4.1
 */
export function ManifestCard({ manifest, onSubmit }: ManifestCardProps) {
  const canEdit = manifest.status === 'draft';
  const canSubmit = manifest.status === 'draft' && manifest.blIds.length > 0;
  
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

  // Get manifest type icon
  const TypeIcon = manifest.manifestType === 'inward' ? ArrowDownLeft : ArrowUpRight;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg font-mono">{manifest.manifestNumber}</h3>
              <ManifestStatusBadge status={manifest.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {MANIFEST_TYPE_LABELS[manifest.manifestType]} Manifest
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Link href={`/agency/manifests/${manifest.id}`}>
              <Button variant="ghost" size="icon" title="View details">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {canEdit && (
              <Link href={`/agency/manifests/${manifest.id}/edit`}>
                <Button variant="ghost" size="icon" title="Edit manifest">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {canSubmit && onSubmit && (
              <Button 
                variant="ghost" 
                size="icon" 
                title="Submit manifest"
                onClick={() => onSubmit(manifest)}
              >
                <Send className="h-4 w-4" />
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
            {manifest.vesselName}
            {manifest.voyageNumber && ` / ${manifest.voyageNumber}`}
          </span>
        </div>

        {/* Route */}
        {(manifest.portOfLoading || manifest.portOfDischarge) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {manifest.portOfLoading || 'TBD'} → {manifest.portOfDischarge || 'TBD'}
            </span>
          </div>
        )}

        {/* Schedule */}
        {(manifest.departureDate || manifest.arrivalDate) && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {manifest.departureDate && `Dep: ${formatDate(manifest.departureDate)}`}
              {manifest.departureDate && manifest.arrivalDate && ' | '}
              {manifest.arrivalDate && `Arr: ${formatDate(manifest.arrivalDate)}`}
            </span>
          </div>
        )}

        {/* B/L Count */}
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>
            {manifest.totalBls} B/L{manifest.totalBls !== 1 ? 's' : ''} linked
          </span>
        </div>

        {/* Totals Summary */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold">{manifest.totalContainers}</div>
              <div className="text-xs text-muted-foreground">Containers</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{manifest.totalPackages.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Packages</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{manifest.totalWeightKg.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">kg</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{manifest.totalCbm.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">CBM</div>
            </div>
          </div>
        </div>

        {/* Submission Info */}
        {manifest.submittedAt && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <span>Submitted: {formatDate(manifest.submittedAt)}</span>
            {manifest.submittedTo && <span> to {manifest.submittedTo}</span>}
          </div>
        )}

        {/* Document URL */}
        {manifest.documentUrl && (
          <div className="text-xs">
            <a 
              href={manifest.documentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              View Document
            </a>
          </div>
        )}

        {/* Created Date */}
        <div className="text-xs text-muted-foreground">
          Created: {formatDate(manifest.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
}
