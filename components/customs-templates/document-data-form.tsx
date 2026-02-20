'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlaceholderDefinition } from '@/types/customs-templates';

interface DocumentDataFormProps {
  placeholders: PlaceholderDefinition[];
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function DocumentDataForm({ placeholders, data, onChange }: DocumentDataFormProps) {
  // Filter out array placeholders (they're auto-populated)
  const editablePlaceholders = placeholders.filter((p) => p.type !== 'array');

  if (editablePlaceholders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No editable fields. All data will be auto-populated from the source.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review and edit the document data below. Fields are pre-filled from the selected source.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {editablePlaceholders.map((placeholder) => (
          <div key={placeholder.key} className="space-y-2">
            <Label htmlFor={placeholder.key}>
              {placeholder.label}
              {placeholder.source === 'manual' && (
                <span className="text-muted-foreground ml-1">(manual)</span>
              )}
            </Label>
            {placeholder.type === 'number' ? (
              <Input
                id={placeholder.key}
                type="number"
                value={String(data[placeholder.key] || '')}
                onChange={(e) => onChange(placeholder.key, parseFloat(e.target.value) || 0)}
              />
            ) : (
              <Input
                id={placeholder.key}
                value={String(data[placeholder.key] || '')}
                onChange={(e) => onChange(placeholder.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Show array placeholders info */}
      {placeholders.some((p) => p.type === 'array') && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">Array Data (Auto-populated)</p>
          <p className="text-xs text-muted-foreground mt-1">
            The following arrays will be populated from the source document:
          </p>
          <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
            {placeholders
              .filter((p) => p.type === 'array')
              .map((p) => (
                <li key={p.key}>
                  {p.label} ({Array.isArray(data[p.key]) ? (data[p.key] as unknown[]).length : 0} items)
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
