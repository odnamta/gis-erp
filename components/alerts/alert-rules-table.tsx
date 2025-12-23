'use client';

// =====================================================
// v0.65: ALERT RULES TABLE COMPONENT
// =====================================================

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { AlertRule, AlertSeverity } from '@/types/alerts';

interface AlertRulesTableProps {
  rules: AlertRule[];
  onEdit?: (rule: AlertRule) => void;
  onDelete?: (ruleId: string) => Promise<void>;
  onToggleStatus?: (ruleId: string) => Promise<void>;
}

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-500' },
  warning: { icon: AlertCircle, color: 'text-orange-500' },
  info: { icon: Info, color: 'text-blue-500' },
};

const ruleTypeLabels: Record<string, string> = {
  threshold: 'Threshold',
  trend: 'Trend',
  anomaly: 'Anomaly',
  schedule: 'Schedule',
  prediction: 'Prediction',
  realtime: 'Real-time',
};

export function AlertRulesTable({
  rules,
  onEdit,
  onDelete,
  onToggleStatus,
}: AlertRulesTableProps) {
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteRuleId || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteRuleId);
    } finally {
      setIsDeleting(false);
      setDeleteRuleId(null);
    }
  };

  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No alert rules configured. Create your first rule to start monitoring.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>KPI</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const SeverityIcon = severityConfig[rule.severity].icon;
            return (
              <TableRow key={rule.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{rule.ruleName}</div>
                    <div className="text-xs text-muted-foreground">{rule.ruleCode}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ruleTypeLabels[rule.ruleType] || rule.ruleType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <SeverityIcon className={`h-4 w-4 ${severityConfig[rule.severity].color}`} />
                    <span className="capitalize">{rule.severity}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {rule.kpiName || '-'}
                </TableCell>
                <TableCell className="capitalize">
                  {rule.checkFrequency}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => onToggleStatus?.(rule.id)}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(rule)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteRuleId(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this alert rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
