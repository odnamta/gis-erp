'use client';

// components/assessments/axle-calc-tab.tsx
// Axle Load Calculation tab for Technical Assessment detail view (v0.58)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle, FileWarning } from 'lucide-react';
import { AxleLoadCalculation, TechnicalAssessment } from '@/types/assessment';
import { formatWeight, formatPercentage } from '@/lib/assessment-utils';
import { deleteAxleCalculation } from '@/lib/assessment-actions';
import { AxleCalcForm } from './axle-calc-form';

interface AxleCalcTabProps {
  assessment: TechnicalAssessment;
  axleCalculations: AxleLoadCalculation[];
  canEdit: boolean;
}

export function AxleCalcTab({ assessment, axleCalculations, canEdit }: AxleCalcTabProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [_editingCalc, setEditingCalc] = useState<AxleLoadCalculation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteAxleCalculation(deleteId);
      router.refresh();
    } catch (error) {
      console.error('Error deleting axle calculation:', error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingCalc(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Axle Load Calculations</h3>
          <p className="text-sm text-muted-foreground">
            {axleCalculations.length} configuration{axleCalculations.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>
        {canEdit && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Axle Load Calculation</DialogTitle>
                <DialogDescription>
                  Configure trailer and prime mover specifications
                </DialogDescription>
              </DialogHeader>
              <AxleCalcForm
                assessmentId={assessment.id}
                onSuccess={handleFormSuccess}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Calculations List */}
      {axleCalculations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No axle load calculations configured yet</p>
            {canEdit && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Configuration
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        axleCalculations.map((calc) => (
          <Card key={calc.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {calc.configuration_name || 'Transport Configuration'}
                    {calc.within_legal_limits === true ? (
                      <Badge variant="outline" className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Within Limits
                      </Badge>
                    ) : calc.within_legal_limits === false ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Exceeds Limits
                      </Badge>
                    ) : null}
                    {calc.permit_required && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileWarning className="h-3 w-3" />
                        Permit Required
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCalc(calc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Axle Load Calculation</DialogTitle>
                        </DialogHeader>
                        <AxleCalcForm
                          assessmentId={assessment.id}
                          axleCalculation={calc}
                          onSuccess={handleFormSuccess}
                          onCancel={() => setEditingCalc(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(calc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Vehicle Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prime Mover */}
                <div>
                  <h4 className="font-medium mb-3">Prime Mover</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span>{calc.prime_mover_type || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Axle Count</span>
                      <span>{calc.prime_mover_axle_count || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight</span>
                      <span>{formatWeight(calc.prime_mover_weight_tons)}</span>
                    </div>
                  </div>
                </div>

                {/* Trailer */}
                <div>
                  <h4 className="font-medium mb-3">Trailer</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span>{calc.trailer_type || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Axle Count</span>
                      <span>{calc.trailer_axle_count || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tare Weight</span>
                      <span>{formatWeight(calc.trailer_tare_weight_tons)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Axle Spacing</span>
                      <span>{calc.trailer_axle_spacing_m ? `${calc.trailer_axle_spacing_m} m` : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cargo */}
              <div>
                <h4 className="font-medium mb-3">Cargo</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo Weight</p>
                    <p className="font-medium">{formatWeight(calc.cargo_weight_tons)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">COG from Front</p>
                    <p className="font-medium">
                      {calc.cargo_cog_from_front_m ? `${calc.cargo_cog_from_front_m} m` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Weight</p>
                    <p className="font-medium text-lg">{formatWeight(calc.total_weight_tons)}</p>
                  </div>
                </div>
              </div>

              {/* Axle Loads Table */}
              {calc.axle_loads && calc.axle_loads.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Axle Load Distribution</h4>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Axle #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Load (tons)</TableHead>
                          <TableHead>Max Allowed (tons)</TableHead>
                          <TableHead>Utilization</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calc.axle_loads.map((axle, index) => (
                          <TableRow key={index}>
                            <TableCell>{axle.axle_number}</TableCell>
                            <TableCell className="capitalize">{axle.axle_type}</TableCell>
                            <TableCell>{axle.load_tons.toFixed(2)}</TableCell>
                            <TableCell>{axle.max_allowed_tons.toFixed(2)}</TableCell>
                            <TableCell>{formatPercentage(axle.utilization_pct)}</TableCell>
                            <TableCell>
                              {axle.load_tons <= axle.max_allowed_tons ? (
                                <Badge variant="outline" className="text-green-600">✓ OK</Badge>
                              ) : (
                                <Badge variant="destructive">⚠ Over</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Max Single Axle</p>
                  <p className="font-medium">{formatWeight(calc.max_single_axle_load_tons)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Tandem Axle</p>
                  <p className="font-medium">{formatWeight(calc.max_tandem_axle_load_tons)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Within Legal Limits</p>
                  <p className="font-medium">
                    {calc.within_legal_limits === true ? 'Yes' : calc.within_legal_limits === false ? 'No' : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Permit Required</p>
                  <p className="font-medium">{calc.permit_required ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Notes */}
              {calc.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{calc.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Axle Calculation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this axle load calculation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
