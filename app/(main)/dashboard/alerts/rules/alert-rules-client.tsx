'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Settings, Loader2 } from 'lucide-react';
import { AlertRule, AlertRuleFormData, AlertRuleType, AlertSeverity, CheckFrequency, VALID_RULE_TYPES, VALID_SEVERITIES, VALID_FREQUENCIES } from '@/types/alerts';
import { AlertRulesTable } from '@/components/alerts/alert-rules-table';
import { createAlertRule, updateAlertRule, deleteAlertRule, toggleAlertRuleStatus } from '@/lib/alert-actions';
import { useToast } from '@/hooks/use-toast';

const RULE_TYPE_LABELS: Record<AlertRuleType, string> = {
  threshold: 'Threshold',
  trend: 'Trend',
  anomaly: 'Anomaly',
  schedule: 'Schedule',
  prediction: 'Prediction',
  realtime: 'Real-time',
};

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

const FREQUENCY_LABELS: Record<CheckFrequency, string> = {
  realtime: 'Real-time',
  hourly: 'Setiap Jam',
  daily: 'Harian',
  weekly: 'Mingguan',
};

interface AlertRulesClientProps {
  initialRules: AlertRule[];
}

export function AlertRulesClient({ initialRules }: AlertRulesClientProps) {
  const [rules, setRules] = useState(initialRules);
  const [_isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleSave = async (formData: AlertRuleFormData) => {
    setIsSaving(true);
    try {
      if (editingRule) {
        const { data, error } = await updateAlertRule(editingRule.id, formData);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return;
        }
        if (data) {
          setRules(prev => prev.map(r => r.id === data.id ? data : r));
          toast({ title: 'Berhasil', description: `Rule "${data.ruleName}" berhasil diperbarui` });
        }
      } else {
        const { data, error } = await createAlertRule(formData);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return;
        }
        if (data) {
          setRules(prev => [...prev, data]);
          toast({ title: 'Berhasil', description: `Rule "${data.ruleName}" berhasil dibuat` });
        }
      }
      setDialogOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    const { success, error } = await deleteAlertRule(ruleId);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
      return;
    }
    if (success) {
      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast({ title: 'Rule Deleted', description: 'The alert rule has been deleted.' });
    }
    startTransition(() => router.refresh());
  };

  const handleToggleStatus = async (ruleId: string) => {
    const { data, error } = await toggleAlertRuleStatus(ruleId);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
      return;
    }
    if (data) {
      setRules(prev => prev.map(r => r.id === ruleId ? data : r));
      toast({
        title: data.isActive ? 'Rule Enabled' : 'Rule Disabled',
        description: `${data.ruleName} is now ${data.isActive ? 'active' : 'inactive'}.`,
      });
    }
    startTransition(() => router.refresh());
  };

  return (
    <>
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

      <AlertRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editingRule}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  );
}

function AlertRuleDialog({
  open,
  onOpenChange,
  rule,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AlertRule | null;
  onSave: (data: AlertRuleFormData) => void;
  isSaving: boolean;
}) {
  const isEdit = !!rule;

  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<AlertRuleType>('threshold');
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [checkFrequency, setCheckFrequency] = useState<CheckFrequency>('daily');
  const [cooldownMinutes, setCooldownMinutes] = useState(60);
  const [thresholdValue, setThresholdValue] = useState<number | undefined>();
  const [isActive, setIsActive] = useState(true);

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && rule) {
      setRuleName(rule.ruleName);
      setRuleCode(rule.ruleCode);
      setDescription(rule.description || '');
      setRuleType(rule.ruleType);
      setSeverity(rule.severity);
      setCheckFrequency(rule.checkFrequency);
      setCooldownMinutes(rule.cooldownMinutes);
      setThresholdValue(rule.thresholdValue);
      setIsActive(rule.isActive);
    } else if (nextOpen) {
      setRuleName('');
      setRuleCode('');
      setDescription('');
      setRuleType('threshold');
      setSeverity('warning');
      setCheckFrequency('daily');
      setCooldownMinutes(60);
      setThresholdValue(undefined);
      setIsActive(true);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!ruleName.trim() || !ruleCode.trim()) return;
    onSave({
      ruleCode,
      ruleName,
      description: description || undefined,
      ruleType,
      severity,
      thresholdValue,
      notifyRoles: [],
      notifyUsers: [],
      notificationChannels: ['in_app'],
      checkFrequency,
      cooldownMinutes,
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Alert Rule' : 'Buat Alert Rule Baru'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kode Rule *</Label>
              <Input
                value={ruleCode}
                onChange={(e) => setRuleCode(e.target.value)}
                placeholder="RULE-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Rule *</Label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Budget Overrun Alert"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi rule..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={ruleType} onValueChange={(v) => setRuleType(v as AlertRuleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALID_RULE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{RULE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as AlertSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALID_SEVERITIES.map(s => (
                    <SelectItem key={s} value={s}>{SEVERITY_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frekuensi</Label>
              <Select value={checkFrequency} onValueChange={(v) => setCheckFrequency(v as CheckFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALID_FREQUENCIES.map(f => (
                    <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {ruleType === 'threshold' && (
            <div className="space-y-2">
              <Label>Threshold Value</Label>
              <Input
                type="number"
                value={thresholdValue ?? ''}
                onChange={(e) => setThresholdValue(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="100"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cooldown (menit)</Label>
              <Input
                type="number"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Aktif</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={!ruleName.trim() || !ruleCode.trim() || isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : isEdit ? 'Simpan' : 'Buat Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
