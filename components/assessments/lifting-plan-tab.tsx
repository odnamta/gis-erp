'use client';

// components/assessments/lifting-plan-tab.tsx
// Lifting Plan tab for Technical Assessment detail view (v0.58)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { LiftingPlan, TechnicalAssessment } from '@/types/assessment';
import { formatWeight, formatPercentage, requiresAdditionalReview } from '@/lib/assessment-utils';
import { deleteLiftingPlan } from '@/lib/assessment-actions';
import { LiftingPlanForm } from './lifting-plan-form';

interface LiftingPlanTabProps {
  assessment: TechnicalAssessment;
  liftingPlans: LiftingPlan[];
  canEdit: boolean;
}

export function LiftingPlanTab({ assessment, liftingPlans, canEdit }: LiftingPlanTabProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [_editingPlan, setEditingPlan] = useState<LiftingPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteLiftingPlan(deleteId);
      router.refresh();
    } catch (error) {
      console.error('Error deleting lifting plan:', error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingPlan(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Lifting Plans</h3>
          <p className="text-sm text-muted-foreground">
            {liftingPlans.length} lift{liftingPlans.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        {canEdit && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Lift
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Lifting Plan</DialogTitle>
                <DialogDescription>
                  Configure crane selection, rigging, and ground requirements
                </DialogDescription>
              </DialogHeader>
              <LiftingPlanForm
                assessmentId={assessment.id}
                onSuccess={handleFormSuccess}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Lifting Plans List */}
      {liftingPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No lifting plans configured yet</p>
            {canEdit && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Lift
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        liftingPlans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Lift #{plan.lift_number}
                    {plan.utilization_percentage && requiresAdditionalReview(plan.utilization_percentage) ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        High Utilization
                      </Badge>
                    ) : plan.utilization_percentage ? (
                      <Badge variant="outline" className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Safe
                      </Badge>
                    ) : null}
                  </CardTitle>
                  {plan.lift_description && (
                    <CardDescription>{plan.lift_description}</CardDescription>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingPlan(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Lifting Plan</DialogTitle>
                        </DialogHeader>
                        <LiftingPlanForm
                          assessmentId={assessment.id}
                          liftingPlan={plan}
                          onSuccess={handleFormSuccess}
                          onCancel={() => setEditingPlan(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(plan.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Load Data */}
              <div>
                <h4 className="font-medium mb-3">Load Data</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Load Weight</p>
                    <p className="font-medium">{formatWeight(plan.load_weight_tons)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rigging Weight</p>
                    <p className="font-medium">{formatWeight(plan.rigging_weight_tons)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Lifted Weight</p>
                    <p className="font-medium text-lg">{formatWeight(plan.total_lifted_weight_tons)}</p>
                  </div>
                </div>
              </div>

              {/* Crane Selection */}
              {plan.crane_type && (
                <div>
                  <h4 className="font-medium mb-3">Crane Selection & Capacity</h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="font-medium mb-3">{plan.crane_type}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parameter</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Limit</TableHead>
                          <TableHead>Utilization</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Total Lifted Weight</TableCell>
                          <TableCell>{formatWeight(plan.total_lifted_weight_tons)}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Working Radius</TableCell>
                          <TableCell>{plan.crane_radius_m ? `${plan.crane_radius_m} m` : '-'}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Capacity at Radius</TableCell>
                          <TableCell>{formatWeight(plan.crane_capacity_at_radius_tons)}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Utilization</TableCell>
                          <TableCell>{formatPercentage(plan.utilization_percentage)}</TableCell>
                          <TableCell>80%</TableCell>
                          <TableCell>{formatPercentage(plan.utilization_percentage)}</TableCell>
                          <TableCell>
                            {plan.utilization_percentage && plan.utilization_percentage <= 80 ? (
                              <Badge variant="outline" className="text-green-600">✓ OK</Badge>
                            ) : plan.utilization_percentage ? (
                              <Badge variant="destructive">⚠ Review</Badge>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Boom Length</TableCell>
                          <TableCell>{plan.crane_boom_length_m ? `${plan.crane_boom_length_m} m` : '-'}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Rigging Configuration */}
              {plan.rigging_configuration && (
                <div>
                  <h4 className="font-medium mb-3">Rigging Configuration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Configuration</p>
                      <p className="font-medium">{plan.rigging_configuration}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sling Type</p>
                      <p className="font-medium">{plan.sling_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sling Capacity</p>
                      <p className="font-medium">{formatWeight(plan.sling_capacity_tons)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quantity</p>
                      <p className="font-medium">{plan.sling_quantity || '-'}</p>
                    </div>
                    {plan.spreader_beam && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Spreader Beam</p>
                          <p className="font-medium">Yes</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Spreader Capacity</p>
                          <p className="font-medium">{formatWeight(plan.spreader_capacity_tons)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Ground Requirements */}
              {(plan.ground_bearing_required_kpa || plan.ground_preparation) && (
                <div>
                  <h4 className="font-medium mb-3">Ground Requirements</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Ground Bearing Required</p>
                      <p className="font-medium">
                        {plan.ground_bearing_required_kpa ? `${plan.ground_bearing_required_kpa} kPa` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ground Preparation</p>
                      <p className="font-medium">{plan.ground_preparation || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outrigger Mats</p>
                      <p className="font-medium">{plan.outrigger_mats ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mat Size</p>
                      <p className="font-medium">{plan.mat_size || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {plan.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.notes}</p>
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
            <AlertDialogTitle>Delete Lifting Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lifting plan? This action cannot be undone.
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
