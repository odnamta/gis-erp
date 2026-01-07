'use client';

import { useState } from 'react';
import { AuditLogEntry } from '@/types/audit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  formatAction,
  formatAuditLogDescription,
  getChangedFieldDetails,
} from '@/lib/system-audit-utils';
import {
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  FileText,
  History,
  ArrowRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EntityAuditHistoryProps {
  entityType: string;
  entityId: string;
  entityReference?: string;
  entries: AuditLogEntry[];
  loading?: boolean;
  onEntryClick?: (entry: AuditLogEntry) => void;
  maxHeight?: string;
}

function getActionIcon(action: string) {
  switch (action.toLowerCase()) {
    case 'create':
    case 'insert':
      return <Plus className="h-4 w-4" />;
    case 'update':
      return <Pencil className="h-4 w-4" />;
    case 'delete':
      return <Trash2 className="h-4 w-4" />;
    case 'view':
      return <Eye className="h-4 w-4" />;
    case 'export':
      return <Download className="h-4 w-4" />;
    case 'approve':
      return <CheckCircle className="h-4 w-4" />;
    case 'reject':
      return <XCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getActionColor(action: string): string {
  switch (action.toLowerCase()) {
    case 'create':
    case 'insert':
      return 'bg-green-500';
    case 'update':
      return 'bg-yellow-500';
    case 'delete':
      return 'bg-red-500';
    case 'approve':
      return 'bg-green-500';
    case 'reject':
      return 'bg-red-500';
    case 'view':
      return 'bg-blue-500';
    case 'export':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

function getActionBadgeVariant(
  action: string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  switch (action.toLowerCase()) {
    case 'create':
    case 'insert':
      return 'success';
    case 'update':
      return 'warning';
    case 'delete':
      return 'destructive';
    case 'approve':
      return 'success';
    case 'reject':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatTimestamp(timestamp: string): string {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
}

function formatRelativeTime(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

/**
 * Compact Change Summary for collapsed view
 */
function ChangeSummary({ entry }: { entry: AuditLogEntry }) {
  const description = formatAuditLogDescription(entry);

  return (
    <div className="text-sm text-muted-foreground">
      {description.changed_fields_summary || description.summary}
    </div>
  );
}

/**
 * Expanded Change Details showing field-level changes
 */
function ChangeDetails({ entry }: { entry: AuditLogEntry }) {
  const changes = getChangedFieldDetails(entry.old_values, entry.new_values);

  if (changes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        No detailed changes recorded
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2">
      {changes.slice(0, 5).map((change) => (
        <div
          key={change.field}
          className="flex items-start gap-2 text-sm bg-gray-50 rounded p-2"
        >
          <span className="font-medium text-gray-700 min-w-[100px]">
            {change.field}:
          </span>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-red-600 line-through truncate max-w-[150px]">
              {change.old_value !== null && change.old_value !== undefined
                ? String(change.old_value)
                : 'null'}
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-green-600 truncate max-w-[150px]">
              {change.new_value !== null && change.new_value !== undefined
                ? String(change.new_value)
                : 'null'}
            </span>
          </div>
        </div>
      ))}
      {changes.length > 5 && (
        <div className="text-xs text-muted-foreground">
          +{changes.length - 5} more changes
        </div>
      )}
    </div>
  );
}

/**
 * Timeline Entry Component
 */
function TimelineEntry({
  entry,
  isFirst,
  isLast,
  onEntryClick,
}: {
  entry: AuditLogEntry;
  isFirst: boolean;
  isLast: boolean;
  onEntryClick?: (entry: AuditLogEntry) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails =
    entry.old_values || entry.new_values || entry.changed_fields?.length;

  const action = entry.action || 'view';
  const timestamp = entry.timestamp || '';

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        {/* Dot */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-white z-10',
            getActionColor(action)
          )}
        >
          {getActionIcon(action)}
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-200 min-h-[20px]" />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="bg-white border rounded-lg shadow-sm">
            {/* Header */}
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getActionBadgeVariant(action)}>
                      {formatAction(action)}
                    </Badge>
                    {entry.changed_fields && entry.changed_fields.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {entry.changed_fields.length} field
                        {entry.changed_fields.length !== 1 ? 's' : ''} changed
                      </span>
                    )}
                  </div>
                  <ChangeSummary entry={entry} />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasDetails && (
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                  {onEntryClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onEntryClick(entry)}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>

              {/* Metadata row */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span title={timestamp ? formatTimestamp(timestamp) : ''}>
                    {timestamp ? formatRelativeTime(timestamp) : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{entry.user_email || 'System'}</span>
                </div>
              </div>
            </div>

            {/* Collapsible Details */}
            {hasDetails && (
              <CollapsibleContent>
                <div className="border-t px-3 pb-3">
                  <ChangeDetails entry={entry} />
                </div>
              </CollapsibleContent>
            )}
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

/**
 * Entity Audit History Component
 * 
 * Displays a timeline view of all changes made to a specific entity.
 * Features:
 * - Chronological timeline with visual indicators
 * - Collapsible change details
 * - Action-specific icons and colors
 * - Relative timestamps
 * - Click handler for viewing full entry details
 * 
 * Requirements: 1.1
 */
export function EntityAuditHistory({
  entityType,
  entityId,
  entityReference,
  entries,
  loading = false,
  onEntryClick,
  maxHeight = '600px',
}: EntityAuditHistoryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading history...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mb-2" />
            <p className="text-sm">No audit history found</p>
            <p className="text-xs">
              Changes to this {entityType.replace(/_/g, ' ')} will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort entries by timestamp descending (most recent first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit History
            <Badge variant="secondary" className="ml-2">
              {entries.length} event{entries.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          {entityReference && (
            <span className="text-sm text-muted-foreground">{entityReference}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea style={{ maxHeight }} className="pr-4">
          <div className="space-y-0">
            {sortedEntries.map((entry, index) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                isFirst={index === 0}
                isLast={index === sortedEntries.length - 1}
                onEntryClick={onEntryClick}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * Compact Entity Audit History for inline use
 * Shows a simplified timeline without the card wrapper
 */
export function EntityAuditHistoryCompact({
  entries,
  onEntryClick,
  maxItems = 5,
}: {
  entries: AuditLogEntry[];
  onEntryClick?: (entry: AuditLogEntry) => void;
  maxItems?: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        No audit history available
      </div>
    );
  }

  // Sort and limit entries
  const sortedEntries = [...entries]
    .sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime())
    .slice(0, maxItems);

  const hasMore = entries.length > maxItems;

  return (
    <div className="space-y-2">
      {sortedEntries.map((entry) => {
        const action = entry.action || 'view';
        const timestamp = entry.timestamp || '';
        return (
          <div
            key={entry.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors',
              onEntryClick && 'cursor-pointer'
            )}
            onClick={() => onEntryClick?.(entry)}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0',
                getActionColor(action)
              )}
            >
              {getActionIcon(action)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={getActionBadgeVariant(action)} className="text-xs">
                  {formatAction(action)}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  by {entry.user_email || 'System'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {timestamp ? formatRelativeTime(timestamp) : '-'}
              </div>
            </div>
          </div>
        );
      })}
      {hasMore && (
        <div className="text-xs text-muted-foreground text-center py-1">
          +{entries.length - maxItems} more events
        </div>
      )}
    </div>
  );
}
