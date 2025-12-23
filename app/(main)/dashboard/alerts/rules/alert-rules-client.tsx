'use client';

// =====================================================
// v0.65: ALERT RULES CLIENT COMPONENT
// =====================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { AlertRule } from '@/types/alerts';
import { AlertRulesTable } from '@/components/alerts/alert-rules-table';
import { deleteAlertRule, toggleAlertRuleStatus } from '@/lib/alert-actions';
import { useToast } from '@/hooks/use-toast';

interface AlertRulesClientProps {
  initialRules: AlertRule[];
}

export function AlertRulesClient({ initialRules }: AlertRulesClientProps) {
  const [rules, setRules] = useState(initialRules);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleEdit = (rule: AlertRule) => {
    // TODO: Open edit dialog or navigate to edit page
    toast({
      title: 'Edit Rule',
      description: `Editing ${rule.ruleName}`,
    });
  };

  const handleDelete = async (ruleId: string) => {
    const { success, error } = await deleteAlertRule(ruleId);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (success) {
      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast({
        title: 'Rule Deleted',
        description: 'The alert rule has been deleted.',
      });
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const handleToggleStatus = async (ruleId: string) => {
    const { data, error } = await toggleAlertRuleStatus(ruleId);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setRules(prev => prev.map(r => r.id === ruleId ? data : r));
      toast({
        title: data.isActive ? 'Rule Enabled' : 'Rule Disabled',
        description: `${data.ruleName} is now ${data.isActive ? 'active' : 'inactive'}.`,
      });
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const handleCreateRule = () => {
    // TODO: Open create dialog
    toast({
      title: 'Create Rule',
      description: 'Rule creation form coming soon',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Alert Rules
        </CardTitle>
        <Button onClick={handleCreateRule}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </CardHeader>
      <CardContent>
        <AlertRulesTable
          rules={rules}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </CardContent>
    </Card>
  );
}
