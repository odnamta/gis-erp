'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { BLContainer, ContainerType, CONTAINER_TYPES } from '@/types/agency';
import { validateContainerNumber, calculateBLTotals } from '@/lib/bl-documentation-utils';
import { Plus, Edit, Trash2, Package, AlertCircle } from 'lucide-react';

interface ContainerDetailsEditorProps {
  containers: BLContainer[];
  onChange: (containers: BLContainer[]) => void;
  readOnly?: boolean;
}

const CONTAINER_TYPE_LABELS: Record<ContainerType, string> = {
  '20GP': "20' General Purpose",
  '40GP': "40' General Purpose",
  '40HC': "40' High Cube",
  '20OT': "20' Open Top",
  '40OT': "40' Open Top",
  '20FR': "20' Flat Rack",
  '40FR': "40' Flat Rack",
  'BREAKBULK': 'Breakbulk',
};

interface ContainerFormState {
  containerNo: string;
  sealNo: string;
  type: ContainerType;
  packages: number | '';
  weightKg: number | '';
}

const initialFormState: ContainerFormState = {
  containerNo: '',
  sealNo: '',
  type: '40GP',
  packages: '',
  weightKg: '',
};

export function ContainerDetailsEditor({ 
  containers, 
  onChange, 
  readOnly = false 
}: ContainerDetailsEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ContainerFormState>(initialFormState);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate totals using utility function
  const totals = calculateBLTotals(containers);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingIndex(null);
    setValidationError(null);
  };

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined) {
      const container = containers[index];
      setFormData({
        containerNo: container.containerNo,
        sealNo: container.sealNo,
        type: container.type,
        packages: container.packages,
        weightKg: container.weightKg,
      });
      setEditingIndex(index);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const validateForm = (): boolean => {
    // Validate container number format (ISO 6346)
    if (formData.containerNo && !validateContainerNumber(formData.containerNo)) {
      setValidationError('Container number must be 4 letters followed by 7 digits (e.g., MSCU1234567)');
      return false;
    }

    // Validate weight is positive
    if (formData.weightKg !== '' && formData.weightKg <= 0) {
      setValidationError('Weight must be a positive number');
      return false;
    }

    // Validate packages is positive
    if (formData.packages !== '' && formData.packages <= 0) {
      setValidationError('Packages must be a positive number');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const newContainer: BLContainer = {
      containerNo: formData.containerNo.toUpperCase(),
      sealNo: formData.sealNo,
      type: formData.type,
      packages: typeof formData.packages === 'number' ? formData.packages : 0,
      weightKg: typeof formData.weightKg === 'number' ? formData.weightKg : 0,
    };

    if (editingIndex !== null) {
      const updated = [...containers];
      updated[editingIndex] = newContainer;
      onChange(updated);
    } else {
      onChange([...containers, newContainer]);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleRemove = (index: number) => {
    const updated = containers.filter((_, i) => i !== index);
    onChange(updated);
  };

  const formatWeight = (weight: number): string => {
    return weight.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' kg';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Container Details</h3>
        </div>
        {!readOnly && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Container
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null ? 'Edit Container' : 'Add Container'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {validationError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="containerNo">Container Number *</Label>
                    <Input
                      id="containerNo"
                      value={formData.containerNo}
                      onChange={(e) => {
                        setFormData({ ...formData, containerNo: e.target.value.toUpperCase() });
                        setValidationError(null);
                      }}
                      placeholder="e.g., MSCU1234567"
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      ISO 6346 format: 4 letters + 7 digits
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sealNo">Seal Number</Label>
                    <Input
                      id="sealNo"
                      value={formData.sealNo}
                      onChange={(e) => setFormData({ ...formData, sealNo: e.target.value })}
                      placeholder="e.g., SL123456"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Container Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as ContainerType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTAINER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CONTAINER_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="packages">Number of Packages</Label>
                    <Input
                      id="packages"
                      type="number"
                      min="0"
                      value={formData.packages}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : parseInt(e.target.value);
                        setFormData({ ...formData, packages: value });
                        setValidationError(null);
                      }}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightKg">Gross Weight (kg)</Label>
                    <Input
                      id="weightKg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.weightKg}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setFormData({ ...formData, weightKg: value });
                        setValidationError(null);
                      }}
                      placeholder="e.g., 25000"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingIndex !== null ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {containers.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container #</TableHead>
                <TableHead>Seal #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Packages</TableHead>
                <TableHead className="text-right">Weight (kg)</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {containers.map((container, index) => (
                <TableRow key={`${container.containerNo}-${index}`}>
                  <TableCell className="font-mono font-medium">
                    {container.containerNo || '-'}
                  </TableCell>
                  <TableCell>{container.sealNo || '-'}</TableCell>
                  <TableCell>{container.type}</TableCell>
                  <TableCell className="text-right">
                    {container.packages?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {container.weightKg?.toLocaleString() || '-'}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(index)}
                          title="Edit container"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(index)}
                          title="Remove container"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals Summary Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Containers:</span>
                  <span className="ml-2 font-medium">{totals.totalContainers}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Packages:</span>
                  <span className="ml-2 font-medium">{totals.totalPackages.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Weight:</span>
                  <span className="ml-2 font-medium">{formatWeight(totals.totalWeightKg)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No containers added yet</p>
          {!readOnly && (
            <p className="text-sm">Click &quot;Add Container&quot; to add container details</p>
          )}
        </div>
      )}
    </div>
  );
}
