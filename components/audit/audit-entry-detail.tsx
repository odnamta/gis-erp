'use client';

import { AuditLogEntry, ChangedField } from '@/types/audit';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatAction,
  formatModule,
  formatAuditLogDescription,
  getChangedFieldDetails,
} from '@/lib/system-audit-utils';
import {
  User,
  Clock,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Minus,
  Plus,
  Hash,
  Server,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AuditEntryDetailProps {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function getStatusIcon(status: string | null) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failure':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
}

function formatTimestamp(timestamp: string): string {
  return format(new Date(timestamp), 'MMMM dd, yyyy HH:mm:ss');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function isValueEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * JSON Diff View Component
 * Displays old and new values side by side with highlighting for changed fields
 */
function JsonDiffView({
  oldValues,
  newValues,
  changedFields,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[] | null;
}) {
  const changes = getChangedFieldDetails(oldValues, newValues);
  const changedFieldSet = new Set(changedFields || []);

  if (changes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4 text-center">
        No value changes recorded
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change) => (
        <DiffFieldRow
          key={change.field}
          change={change}
          isHighlighted={changedFieldSet.has(change.field)}
        />
      ))}
    </div>
  );
}

/**
 * Individual diff field row showing old → new value
 */
function DiffFieldRow({
  change,
  isHighlighted,
}: {
  change: ChangedField;
  isHighlighted: boolean;
}) {
  const oldEmpty = isValueEmpty(change.old_value);
  const newEmpty = isValueEmpty(change.new_value);

  // Determine the type of change
  const isAddition = oldEmpty && !newEmpty;
  const isDeletion = !oldEmpty && newEmpty;
  const isModification = !oldEmpty && !newEmpty;

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        isHighlighted ? 'border-yellow-300 bg-yellow-50/50' : 'border-gray-200 bg-gray-50/50'
      )}
    >
      {/* Field name with change type indicator */}
      <div className="flex items-center gap-2 mb-2">
        {isAddition && <Plus className="h-4 w-4 text-green-500" />}
        {isDeletion && <Minus className="h-4 w-4 text-red-500" />}
        {isModification && <ArrowRight className="h-4 w-4 text-yellow-500" />}
        <span className="font-medium text-sm">{change.field}</span>
        {isHighlighted && (
          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
            Changed
          </Badge>
        )}
      </div>

      {/* Values comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Old Value */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Previous Value
          </span>
          <pre
            className={cn(
              'text-xs p-2 rounded overflow-auto max-h-32',
              oldEmpty
                ? 'bg-gray-100 text-gray-400 italic'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}
          >
            {formatValue(change.old_value)}
          </pre>
        </div>

        {/* New Value */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            New Value
          </span>
          <pre
            className={cn(
              'text-xs p-2 rounded overflow-auto max-h-32',
              newEmpty
                ? 'bg-gray-100 text-gray-400 italic'
                : 'bg-green-50 text-green-700 border border-green-200'
            )}
          >
            {formatValue(change.new_value)}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * Changed Fields List Component
 * Displays a list of field names that were modified
 */
function ChangedFieldsList({ fields }: { fields: string[] | null }) {
  if (!fields || fields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No changed fields recorded
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <Badge
          key={field}
          variant="outline"
          className="bg-yellow-50 text-yellow-700 border-yellow-300"
        >
          {field}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Info Row Component for displaying key-value pairs
 */
function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div className={cn('text-sm break-all', mono && 'font-mono text-xs')}>
          {value}
        </div>
      </div>
    </div>
  );
}

/**
 * Audit Entry Detail Dialog
 * 
 * Displays full audit entry information including:
 * - User and timestamp information
 * - Action and entity details
 * - JSON diff view for old/new values
 * - Changed fields list
 * - Request context (IP, user agent, etc.)
 * 
 * Requirements: 1.2, 1.3
 */
export function AuditEntryDetail({
  entry,
  open,
  onOpenChange,
}: AuditEntryDetailProps) {
  if (!entry) return null;

  const description = formatAuditLogDescription(entry);
  const hasValueChanges = entry.old_values || entry.new_values;
  const hasChangedFields = entry.changed_fields && entry.changed_fields.length > 0;
  const hasRequestContext =
    entry.ip_address || entry.user_agent || entry.request_method || entry.session_id;

  // Safely get action and entity_type with defaults
  const action = entry.action || 'view';
  const entityType = entry.entity_type || 'unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-3">
            <Badge variant={getActionBadgeVariant(action)} className="text-sm">
              {formatAction(action)}
            </Badge>
            <span className="text-lg">{entityType.replace(/_/g, ' ')}</span>
            {entry.entity_reference && (
              <span className="text-muted-foreground font-normal">
                ({entry.entity_reference})
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {getStatusIcon(entry.status ?? null)}
            <span>{description.summary}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="px-6 pb-6 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  icon={Clock}
                  label="Timestamp"
                  value={entry.timestamp ? formatTimestamp(entry.timestamp) : null}
                />
                <InfoRow
                  icon={User}
                  label="User"
                  value={entry.user_email || 'System'}
                />
                <InfoRow
                  icon={FileText}
                  label="Module"
                  value={entry.module ? formatModule(entry.module) : null}
                />
                <InfoRow
                  icon={Hash}
                  label="Entity ID"
                  value={entry.entity_id}
                  mono
                />
                {entry.user_role && (
                  <InfoRow icon={User} label="User Role" value={entry.user_role} />
                )}
                {entry.status && (
                  <div className="flex items-start gap-3">
                    {getStatusIcon(entry.status)}
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Status
                      </div>
                      <Badge
                        variant={entry.status === 'success' ? 'default' : 'destructive'}
                        className="mt-1"
                      >
                        {entry.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            {entry.description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Changed Fields */}
            {hasChangedFields && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Changed Fields ({entry.changed_fields?.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChangedFieldsList fields={entry.changed_fields ?? null} />
                </CardContent>
              </Card>
            )}

            {/* Value Changes (JSON Diff) */}
            {hasValueChanges && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Value Changes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <JsonDiffView
                    oldValues={entry.old_values ?? null}
                    newValues={entry.new_values ?? null}
                    changedFields={entry.changed_fields ?? null}
                  />
                </CardContent>
              </Card>
            )}

            {/* Request Context */}
            {hasRequestContext && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Request Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow icon={Globe} label="IP Address" value={entry.ip_address} mono />
                  {entry.request_method && entry.request_path && (
                    <InfoRow
                      icon={Server}
                      label="Request"
                      value={`${entry.request_method} ${entry.request_path}`}
                      mono
                    />
                  )}
                  <InfoRow
                    icon={Hash}
                    label="Session ID"
                    value={entry.session_id ? `${entry.session_id.substring(0, 16)}...` : null}
                    mono
                  />
                  {entry.user_agent && (
                    <div className="md:col-span-2">
                      <InfoRow icon={Globe} label="User Agent" value={entry.user_agent} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Error Message */}
            {entry.error_message && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    Error Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono bg-red-100 p-3 rounded">
                    {entry.error_message}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
