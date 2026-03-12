'use client';

// components/assessments/calculations-tab.tsx
// Calculations tab for Technical Assessment detail view (v0.58)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, Edit, Trash2, Calculator, Loader2 } from 'lucide-react';
import { TechnicalAssessment, Calculation } from '@/types/assessment';
import { updateAssessment } from '@/lib/assessment-actions';

interface CalculationsTabProps {
  assessment: TechnicalAssessment;
  canEdit: boolean;
}

interface CalculationFormData {
  name: string;
  formula: string;
  inputs: Record<string, number>;
  result: number;
  unit: string;
}

const emptyCalculation: CalculationFormData = {
  name: '',
  formula: '',
  inputs: {},
  result: 0,
  unit: '',
};

export function CalculationsTab({ assessment, canEdit }: CalculationsTabProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CalculationFormData>(emptyCalculation);
  const [inputKey, setInputKey] = useState('');
  const [inputValue, setInputValue] = useState('');

  const calculations = assessment.calculations || [];

  const handleAddInput = () => {
    if (!inputKey.trim()) return;
    setFormData({
      ...formData,
      inputs: {
        ...formData.inputs,
        [inputKey]: parseFloat(inputValue) || 0,
      },
    });
    setInputKey('');
    setInputValue('');
  };

  const handleRemoveInput = (key: string) => {
    const newInputs = { ...formData.inputs };
    delete newInputs[key];
    setFormData({ ...formData, inputs: newInputs });
  };

  const handleOpenEdit = (index: number) => {
    const calc = calculations[index];
    setFormData({
      name: calc.name,
      formula: calc.formula,
      inputs: { ...calc.inputs },
      result: calc.result,
      unit: calc.unit,
    });
    setEditingIndex(index);
    setIsFormOpen(true);
  };

  const handleOpenNew = () => {
    setFormData(emptyCalculation);
    setEditingIndex(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setLoading(true);

    try {
      const newCalc: Calculation = {
        name: formData.name,
        formula: formData.formula,
        inputs: formData.inputs,
        result: formData.result,
        unit: formData.unit,
      };

      let updatedCalculations: Calculation[];
      if (editingIndex !== null) {
        updatedCalculations = [...calculations];
        updatedCalculations[editingIndex] = newCalc;
      } else {
        updatedCalculations = [...calculations, newCalc];
      }

      const result = await updateAssessment(assessment.id, {
        calculations: updatedCalculations,
      });

      if (result.success) {
        setIsFormOpen(false);
        setFormData(emptyCalculation);
        setEditingIndex(null);
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving calculation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteIndex === null) return;
    setLoading(true);

    try {
      const updatedCalculations = calculations.filter((_, i) => i !== deleteIndex);
      const result = await updateAssessment(assessment.id, {
        calculations: updatedCalculations,
      });

      if (result.success) {
        setDeleteIndex(null);
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting calculation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Engineering Calculations</h3>
          <p className="text-sm text-muted-foreground">
            {calculations.length} calculation{calculations.length !== 1 ? 's' : ''} defined
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Calculation
          </Button>
        )}
      </div>

      {calculations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No calculations added yet</p>
            {canEdit && (
              <Button variant="outline" className="mt-4" onClick={handleOpenNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Calculation
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {calculations.map((calc, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{calc.name}</CardTitle>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteIndex(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm">
                    {calc.formula}
                  </div>
                  {Object.keys(calc.inputs).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(calc.inputs).map(([key, value]) => (
                        <span
                          key={key}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                        >
                          {key} = {value}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Result:</span>
                    <span className="text-2xl font-bold">{calc.result}</span>
                    <span className="text-muted-foreground">{calc.unit}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Edit Calculation' : 'Add Calculation'}
            </DialogTitle>
            <DialogDescription>
              Define the calculation with formula, inputs, and result
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Ground Bearing Pressure"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formula">Formula</Label>
              <Input
                id="formula"
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                placeholder="e.g., P = W / A"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Input Variables</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Variable name"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Value"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={handleAddInput}>
                  Add
                </Button>
              </div>
              {Object.keys(formData.inputs).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(formData.inputs).map(([key, value]) => (
                    <span
                      key={key}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm flex items-center gap-1"
                    >
                      {key} = {value}
                      <button
                        type="button"
                        onClick={() => handleRemoveInput(key)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="result">Result *</Label>
                <Input
                  id="result"
                  type="number"
                  step="0.01"
                  value={formData.result}
                  onChange={(e) =>
                    setFormData({ ...formData, result: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., kPa, tons, m"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !formData.name.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingIndex !== null ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calculation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this calculation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
