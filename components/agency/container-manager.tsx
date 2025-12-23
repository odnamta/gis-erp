'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BookingContainer, ContainerFormData, ContainerType, CONTAINER_TYPES } from '@/types/agency';
import { calculateTotalWeight, calculateTotalContainers, formatWeight } from '@/lib/booking-utils';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

interface ContainerManagerProps {
  containers: BookingContainer[];
  onChange: (containers: BookingContainer[]) => void;
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

export function ContainerManager({ containers, onChange, readOnly = false }: ContainerManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ContainerFormData>({
    containerType: '40GP',
  });

  const totalWeight = calculateTotalWeight(containers);
  const totalCount = calculateTotalContainers(containers);

  const resetForm = () => {
    setFormData({ containerType: '40GP' });
    setEditingIndex(null);
  };

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined) {
      const container = containers[index];
      setFormData({
        containerNumber: container.containerNumber,
        containerType: container.containerType,
        sealNumber: container.sealNumber,
        packagesCount: container.packagesCount,
        packageType: container.packageType,
        grossWeightKg: container.grossWeightKg,
        cargoDescription: container.cargoDescription,
      });
      setEditingIndex(index);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const newContainer: BookingContainer = {
      id: editingIndex !== null ? containers[editingIndex].id : `temp-${Date.now()}`,
      bookingId: editingIndex !== null ? containers[editingIndex].bookingId : '',
      containerNumber: formData.containerNumber,
      containerType: formData.containerType,
      sealNumber: formData.sealNumber,
      packagesCount: formData.packagesCount,
      packageType: formData.packageType,
      grossWeightKg: formData.grossWeightKg,
      cargoDescription: formData.cargoDescription,
      cargoDimensions: formData.cargoDimensions,
      status: 'empty',
      createdAt: editingIndex !== null ? containers[editingIndex].createdAt : new Date().toISOString(),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Container Requirements</h3>
        </div>
        {!readOnly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="containerType">Container Type *</Label>
                    <Select
                      value={formData.containerType}
                      onValueChange={(value) => setFormData({ ...formData, containerType: value as ContainerType })}
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
                  <div className="space-y-2">
                    <Label htmlFor="containerNumber">Container Number</Label>
                    <Input
                      id="containerNumber"
                      value={formData.containerNumber || ''}
                      onChange={(e) => setFormData({ ...formData, containerNumber: e.target.value })}
                      placeholder="e.g., MSCU1234567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sealNumber">Seal Number</Label>
                    <Input
                      id="sealNumber"
                      value={formData.sealNumber || ''}
                      onChange={(e) => setFormData({ ...formData, sealNumber: e.target.value })}
                      placeholder="e.g., SL123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grossWeightKg">Gross Weight (kg)</Label>
                    <Input
                      id="grossWeightKg"
                      type="number"
                      value={formData.grossWeightKg || ''}
                      onChange={(e) => setFormData({ ...formData, grossWeightKg: parseFloat(e.target.value) || undefined })}
                      placeholder="e.g., 25000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="packagesCount">Packages Count</Label>
                    <Input
                      id="packagesCount"
                      type="number"
                      value={formData.packagesCount || ''}
                      onChange={(e) => setFormData({ ...formData, packagesCount: parseInt(e.target.value) || undefined })}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packageType">Package Type</Label>
                    <Input
                      id="packageType"
                      value={formData.packageType || ''}
                      onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
                      placeholder="e.g., Pallets, Cartons"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargoDescription">Cargo Description</Label>
                  <Input
                    id="cargoDescription"
                    value={formData.cargoDescription || ''}
                    onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                    placeholder="Brief description of cargo"
                  />
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
                <TableHead>Type</TableHead>
                <TableHead>Container #</TableHead>
                <TableHead>Seal #</TableHead>
                <TableHead className="text-right">Weight (kg)</TableHead>
                <TableHead>Contents</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {containers.map((container, index) => (
                <TableRow key={container.id}>
                  <TableCell className="font-medium">{container.containerType}</TableCell>
                  <TableCell>{container.containerNumber || '-'}</TableCell>
                  <TableCell>{container.sealNumber || '-'}</TableCell>
                  <TableCell className="text-right">
                    {container.grossWeightKg?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {container.cargoDescription || '-'}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(index)}
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
          <div className="text-sm text-muted-foreground">
            Total: {totalCount} container{totalCount !== 1 ? 's' : ''} • {formatWeight(totalWeight)}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No containers added yet</p>
          {!readOnly && (
            <p className="text-sm">Click &quot;Add Container&quot; to add container requirements</p>
          )}
        </div>
      )}
    </div>
  );
}
