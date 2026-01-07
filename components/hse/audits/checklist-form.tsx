'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Plus } from 'lucide-react';
import { ChecklistTemplate, ChecklistResponse, ChecklistItem } from '@/types/audit';

interface ChecklistFormProps {
  template: ChecklistTemplate;
  responses: ChecklistResponse[];
  onResponseChange: (response: ChecklistResponse) => void;
  onAddFinding: (itemIndex: number, section: string, question: string) => void;
  readOnly?: boolean;
}

export function ChecklistForm({
  template,
  responses,
  onResponseChange,
  onAddFinding,
  readOnly = false,
}: ChecklistFormProps) {
  const getResponse = (section: string, itemIndex: number): ChecklistResponse | undefined => {
    return responses.find(
      (r) => r.section === section && r.item_index === itemIndex
    );
  };

  const handleResponseChange = (
    section: string,
    itemIndex: number,
    question: string,
    value: string | boolean | number | null,
    notes?: string
  ) => {
    const existing = getResponse(section, itemIndex);
    onResponseChange({
      section,
      item_index: itemIndex,
      question,
      response: value,
      notes: notes ?? existing?.notes ?? undefined,
      finding_created: existing?.finding_created ?? false,
    });
  };

  const handleNotesChange = (
    section: string,
    itemIndex: number,
    question: string,
    notes: string
  ) => {
    const existing = getResponse(section, itemIndex);
    onResponseChange({
      section,
      item_index: itemIndex,
      question,
      response: existing?.response ?? null,
      notes,
      finding_created: existing?.finding_created ?? false,
    });
  };

  const renderItem = (item: ChecklistItem, section: string, itemIndex: number) => {
    const response = getResponse(section, itemIndex);
    const itemId = `${section}-${itemIndex}`;

    return (
      <div key={itemId} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Label className="text-sm font-medium">
              {item.question}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {item.weight > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                (Weight: {item.weight})
              </span>
            )}
          </div>
          {!readOnly && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-orange-600 hover:text-orange-700"
              onClick={() => onAddFinding(itemIndex, section, item.question)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Add Finding
            </Button>
          )}
        </div>

        {item.type === 'yes_no' && (
          <RadioGroup
            value={response?.response === true ? 'yes' : response?.response === false ? 'no' : ''}
            onValueChange={(value) =>
              handleResponseChange(section, itemIndex, item.question, value === 'yes')
            }
            disabled={readOnly}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id={`${itemId}-yes`} />
              <Label htmlFor={`${itemId}-yes`}>Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id={`${itemId}-no`} />
              <Label htmlFor={`${itemId}-no`}>No</Label>
            </div>
          </RadioGroup>
        )}

        {item.type === 'rating' && (
          <RadioGroup
            value={response?.response?.toString() || ''}
            onValueChange={(value) =>
              handleResponseChange(section, itemIndex, item.question, parseInt(value))
            }
            disabled={readOnly}
            className="flex gap-2"
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <div key={rating} className="flex items-center space-x-1">
                <RadioGroupItem value={rating.toString()} id={`${itemId}-${rating}`} />
                <Label htmlFor={`${itemId}-${rating}`}>{rating}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {item.type === 'text' && (
          <Textarea
            value={(response?.response as string) || ''}
            onChange={(e) =>
              handleResponseChange(section, itemIndex, item.question, e.target.value)
            }
            disabled={readOnly}
            placeholder="Enter response..."
            rows={2}
          />
        )}

        {item.type === 'select' && item.options && (
          <Select
            value={(response?.response as string) || ''}
            onValueChange={(value) =>
              handleResponseChange(section, itemIndex, item.question, value)
            }
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {item.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Input
            value={response?.notes || ''}
            onChange={(e) =>
              handleNotesChange(section, itemIndex, item.question, e.target.value)
            }
            disabled={readOnly}
            placeholder="Add notes..."
            className="mt-1"
          />
        </div>

        {response?.finding_created && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            Finding created for this item
          </div>
        )}
      </div>
    );
  };

  if (!template.sections || template.sections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            No checklist template configured for this audit type
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {template.sections.map((section, sectionIndex) => (
        <Card key={sectionIndex}>
          <CardHeader>
            <CardTitle className="text-lg">{section.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.items.map((item, itemIndex) =>
              renderItem(item, section.name, itemIndex)
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
