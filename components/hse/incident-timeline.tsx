'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Clock,
  User,
} from 'lucide-react';
import { IncidentHistoryEntry } from '@/types/incident';
import { formatIncidentDateTime } from '@/lib/incident-utils';

interface IncidentTimelineProps {
  history: IncidentHistoryEntry[];
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case 'created':
      return <FileText className="h-4 w-4" />;
    case 'investigation_started':
      return <Search className="h-4 w-4" />;
    case 'investigation_completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'closed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'corrective_action_added':
    case 'preventive_action_added':
      return <Plus className="h-4 w-4" />;
    case 'action_completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'status_change':
      return <Clock className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getActionColor(actionType: string): string {
  switch (actionType) {
    case 'created':
      return 'bg-blue-100 text-blue-600';
    case 'investigation_started':
      return 'bg-purple-100 text-purple-600';
    case 'investigation_completed':
    case 'closed':
    case 'action_completed':
      return 'bg-green-100 text-green-600';
    case 'rejected':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function IncidentTimeline({ history }: IncidentTimelineProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Belum ada aktivitas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="relative flex gap-4 pl-10">
                {/* Icon */}
                <div
                  className={`absolute left-0 p-2 rounded-full ${getActionColor(entry.actionType)}`}
                >
                  {getActionIcon(entry.actionType)}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium">{entry.description}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatIncidentDateTime(entry.performedAt)}</span>
                    {entry.performedByName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.performedByName}
                      </span>
                    )}
                  </div>
                  {entry.previousValue && entry.newValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.previousValue} → {entry.newValue}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
