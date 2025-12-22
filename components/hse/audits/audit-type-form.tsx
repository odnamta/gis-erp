'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import {
  AuditType,
  CreateAuditTypeInput,
  UpdateAuditTypeInput,
  AUDIT_CATEGORIES,
} from '@/types/audit';
import { createAuditType, updateAuditType } from '@/lib/audit-actions';
import { formatCategory } from '@/lib/audit-utils';

interface AuditTypeFormProps {
  auditType?: AuditType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AuditTypeForm({ auditType, onSuccess, onCancel }: AuditTypeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [typeCode, setTypeCode] = useState(auditType?.type_code || '');
  const [typeName, setTypeName] = useState(auditType?.type_name || '');
  const [description, setDescription] = useState(auditType?.description || '');
  const [category, setCategory] = useState(auditType?.category || 'safety_audit');
  const [frequencyDays, setFrequencyDays] = useState(
    auditType?.frequency_days?.toString() || ''
  );

  const isEdit = !!auditType;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!typeCode.trim()) {
      setError('Type code is required');
      return;
    }
    if (!typeName.trim()) {
      setError('Type name is required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const input: UpdateAuditTypeInput = {
          type_name: typeName,
          description: description || undefined,
          category: category as any,
          frequency_days: frequencyDays ? parseInt(frequencyDays) : null,
        };
        const { error: updateError } = await updateAuditType(auditType.id, input);
        if (updateError) {
          setError(updateError);
          return;
        }
      } else {
        const input: CreateAuditTypeInput = {
          type_code: typeCode.toUpperCase(),
          type_name: typeName,
          description: description || undefined,
          category: category as any,
          frequency_days: frequencyDays ? parseInt(frequencyDays) : undefined,
        };
        const { error: createError } = await createAuditType(input);
        if (createError) {
          setError(createError);
          return;
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.back();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Audit Type' : 'New Audit Type'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="typeCode">Type Code *</Label>
              <Input
                id="typeCode"
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                placeholder="e.g., WORKPLACE, VEHICLE"
                disabled={isEdit}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this audit type
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeName">Type Name *</Label>
              <Input
                id="typeName"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="e.g., Workplace Safety Inspection"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and scope of this audit type..."
              rows={2}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as any)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {formatCategory(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequencyDays">Frequency (Days)</Label>
              <Input
                id="frequencyDays"
                type="number"
                min="1"
                value={frequencyDays}
                onChange={(e) => setFrequencyDays(e.target.value)}
                placeholder="e.g., 7 for weekly, 30 for monthly"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for ad-hoc audits
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => router.back())}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
