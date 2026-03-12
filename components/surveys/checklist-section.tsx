'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SurveyChecklistItem, ChecklistStatus, ChecklistCategory } from '@/types/survey';
import { updateChecklistItem } from '@/lib/survey-actions';
import { CheckCircle, AlertTriangle, XCircle, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistSectionProps {
  surveyId: string;
  checklist: SurveyChecklistItem[];
  editable?: boolean;
}

const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  road_condition: 'Road Condition',
  clearances: 'Clearances',
  bridges: 'Bridges',
  utilities: 'Utilities',
  traffic: 'Traffic',
  permits: 'Permits',
  access: 'Access',
};

const STATUS_CONFIG: Record<ChecklistStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800', label: 'Pending' },
  ok: { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800', label: 'OK' },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800', label: 'Warning' },
  fail: { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-100 text-red-800', label: 'Fail' },
};

export function ChecklistSection({ surveyId: _surveyId, checklist, editable = false }: ChecklistSectionProps) {
  const router = useRouter();
  const [editingItems, setEditingItems] = useState<Record<string, { status: ChecklistStatus; notes: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Group checklist by category
  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<ChecklistCategory, SurveyChecklistItem[]>);

  const handleEdit = (item: SurveyChecklistItem) => {
    setEditingItems((prev) => ({
      ...prev,
      [item.id]: { status: item.status, notes: item.notes || '' },
    }));
  };

  const handleCancel = (itemId: string) => {
    setEditingItems((prev) => {
      const newItems = { ...prev };
      delete newItems[itemId];
      return newItems;
    });
  };

  const handleSave = async (itemId: string) => {
    const editData = editingItems[itemId];
    if (!editData) return;

    setSaving(itemId);
    try {
      const result = await updateChecklistItem(itemId, editData.status, editData.notes);
      if (result.success) {
        toast.success('Checklist item updated');
        handleCancel(itemId);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setSaving(null);
    }
  };

  const handleStatusChange = (itemId: string, status: ChecklistStatus) => {
    setEditingItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], status },
    }));
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setEditingItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], notes },
    }));
  };

  // Calculate summary
  const summary = {
    total: checklist.length,
    ok: checklist.filter((c) => c.status === 'ok').length,
    warning: checklist.filter((c) => c.status === 'warning').length,
    fail: checklist.filter((c) => c.status === 'fail').length,
    pending: checklist.filter((c) => c.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{summary.ok}</p>
                <p className="text-sm text-muted-foreground">OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{summary.warning}</p>
                <p className="text-sm text-muted-foreground">Warning</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{summary.fail}</p>
                <p className="text-sm text-muted-foreground">Fail</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{summary.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist by Category */}
      {Object.entries(groupedChecklist).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABELS[category as ChecklistCategory] || category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => {
                const isEditing = !!editingItems[item.id];
                const editData = editingItems[item.id];
                const config = STATUS_CONFIG[isEditing ? editData.status : item.status];

                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span className="font-medium">{item.checkItem}</span>
                      </div>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <Select
                            value={editData.status}
                            onValueChange={(v) => handleStatusChange(item.id, v as ChecklistStatus)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="ok">OK</SelectItem>
                              <SelectItem value="warning">Warning</SelectItem>
                              <SelectItem value="fail">Fail</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Notes..."
                            value={editData.notes}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          />
                        </div>
                      ) : (
                        item.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(item.id)}
                            disabled={saving === item.id}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSave(item.id)}
                            disabled={saving === item.id}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge className={config.color}>{config.label}</Badge>
                          {editable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                            >
                              Edit
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {checklist.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No checklist items found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
