'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, Plus, User, Calendar } from 'lucide-react';
import { IncidentAction, ActionStatus } from '@/types/incident';
import { formatIncidentDate, getActionStatusLabel } from '@/lib/incident-utils';

interface ActionsListProps {
  title: string;
  actions: IncidentAction[];
  onComplete?: (actionId: string) => void;
  onAdd?: () => void;
  canAdd?: boolean;
  canComplete?: boolean;
}

function getStatusIcon(status: ActionStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'overdue':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

export function ActionsList({
  title,
  actions,
  onComplete,
  onAdd,
  canAdd,
  canComplete,
}: ActionsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        {canAdd && onAdd && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Belum ada tindakan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex gap-3">
                  {getStatusIcon(action.status)}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{action.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {action.responsibleName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {action.responsibleName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatIncidentDate(action.dueDate)}
                      </span>
                    </div>
                    {action.completedAt && (
                      <p className="text-xs text-green-600">
                        Selesai: {formatIncidentDate(action.completedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={action.status === 'completed' ? 'default' : action.status === 'overdue' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {getActionStatusLabel(action.status)}
                  </Badge>
                  {canComplete && action.status !== 'completed' && onComplete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onComplete(action.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
