'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { Incident, ContributingFactor } from '@/types/incident';
import { getContributingFactorLabel } from '@/lib/incident-utils';

interface InvestigationPanelProps {
  incident: Incident;
  onSave: (rootCause: string, factors: ContributingFactor[]) => Promise<void>;
  readonly?: boolean;
}

const allFactors: ContributingFactor[] = [
  'equipment_failure',
  'procedure_not_followed',
  'human_error',
  'environmental_conditions',
  'training_gap',
];

export function InvestigationPanel({ incident, onSave, readonly }: InvestigationPanelProps) {
  const [rootCause, setRootCause] = useState(incident.rootCause || '');
  const [factors, setFactors] = useState<ContributingFactor[]>(incident.contributingFactors || []);
  const [saving, setSaving] = useState(false);

  const toggleFactor = (factor: ContributingFactor) => {
    setFactors((prev) =>
      prev.includes(factor) ? prev.filter((f) => f !== factor) : [...prev, factor]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rootCause, factors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analisis Root Cause</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Root Cause</Label>
          <Textarea
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            placeholder="Jelaskan penyebab utama insiden..."
            rows={4}
            disabled={readonly}
          />
        </div>

        <div className="space-y-2">
          <Label>Faktor Kontribusi</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allFactors.map((factor) => (
              <div key={factor} className="flex items-center space-x-2">
                <Checkbox
                  id={factor}
                  checked={factors.includes(factor)}
                  onCheckedChange={() => toggleFactor(factor)}
                  disabled={readonly}
                />
                <label
                  htmlFor={factor}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {getContributingFactorLabel(factor)}
                </label>
              </div>
            ))}
          </div>
        </div>

        {!readonly && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
