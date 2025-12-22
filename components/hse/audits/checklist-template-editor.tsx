'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import {
  ChecklistTemplate,
  ChecklistSection,
  ChecklistItem,
  CHECKLIST_ITEM_TYPES,
} from '@/types/audit';

interface ChecklistTemplateEditorProps {
  template: ChecklistTemplate;
  onChange: (template: ChecklistTemplate) => void;
  onSave?: () => void;
}

export function ChecklistTemplateEditor({
  template,
  onChange,
  onSave,
}: ChecklistTemplateEditorProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  function addSection() {
    const newSection: ChecklistSection = {
      name: `Section ${template.sections.length + 1}`,
      items: [],
    };
    onChange({
      sections: [...template.sections, newSection],
    });
  }

  function updateSection(index: number, updates: Partial<ChecklistSection>) {
    const newSections = [...template.sections];
    newSections[index] = { ...newSections[index], ...updates };
    onChange({ sections: newSections });
  }

  function removeSection(index: number) {
    const newSections = template.sections.filter((_, i) => i !== index);
    onChange({ sections: newSections });
  }

  function addItem(sectionIndex: number) {
    const newItem: ChecklistItem = {
      question: '',
      type: 'yes_no',
      weight: 1,
      required: true,
    };
    const newSections = [...template.sections];
    newSections[sectionIndex].items.push(newItem);
    onChange({ sections: newSections });
  }

  function updateItem(
    sectionIndex: number,
    itemIndex: number,
    updates: Partial<ChecklistItem>
  ) {
    const newSections = [...template.sections];
    newSections[sectionIndex].items[itemIndex] = {
      ...newSections[sectionIndex].items[itemIndex],
      ...updates,
    };
    onChange({ sections: newSections });
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    const newSections = [...template.sections];
    newSections[sectionIndex].items = newSections[sectionIndex].items.filter(
      (_, i) => i !== itemIndex
    );
    onChange({ sections: newSections });
  }

  function formatItemType(type: string): string {
    const labels: Record<string, string> = {
      yes_no: 'Yes/No',
      rating: 'Rating (1-5)',
      text: 'Text',
      select: 'Select',
    };
    return labels[type] || type;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Checklist Template</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
          {onSave && (
            <Button size="sm" onClick={onSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {template.sections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No sections yet. Click "Add Section" to start building your checklist.</p>
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="space-y-4"
          >
            {template.sections.map((section, sectionIndex) => (
              <AccordionItem
                key={sectionIndex}
                value={`section-${sectionIndex}`}
                className="border rounded-lg"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={section.name}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateSection(sectionIndex, { name: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="max-w-xs"
                      placeholder="Section name"
                    />
                    <span className="text-sm text-muted-foreground">
                      ({section.items.length} items)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSection(sectionIndex);
                    }}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {section.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="p-3 border rounded-md space-y-3 bg-muted/30"
                      >
                        <div className="flex items-start gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-2" />
                          <div className="flex-1 space-y-3">
                            <div className="space-y-2">
                              <Label>Question</Label>
                              <Input
                                value={item.question}
                                onChange={(e) =>
                                  updateItem(sectionIndex, itemIndex, {
                                    question: e.target.value,
                                  })
                                }
                                placeholder="Enter question..."
                              />
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={item.type}
                                  onValueChange={(value) =>
                                    updateItem(sectionIndex, itemIndex, {
                                      type: value as any,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CHECKLIST_ITEM_TYPES.map((type) => (
                                      <SelectItem key={type} value={type}>
                                        {formatItemType(type)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Weight</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={item.weight}
                                  onChange={(e) =>
                                    updateItem(sectionIndex, itemIndex, {
                                      weight: parseInt(e.target.value) || 1,
                                    })
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-2 pt-6">
                                <Switch
                                  checked={item.required}
                                  onCheckedChange={(checked) =>
                                    updateItem(sectionIndex, itemIndex, {
                                      required: checked,
                                    })
                                  }
                                />
                                <Label>Required</Label>
                              </div>
                            </div>
                            {item.type === 'select' && (
                              <div className="space-y-2">
                                <Label>Options (comma-separated)</Label>
                                <Input
                                  value={item.options?.join(', ') || ''}
                                  onChange={(e) =>
                                    updateItem(sectionIndex, itemIndex, {
                                      options: e.target.value
                                        .split(',')
                                        .map((o) => o.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                  placeholder="Option 1, Option 2, Option 3"
                                />
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(sectionIndex, itemIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addItem(sectionIndex)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
