'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AssetAssignment } from '@/types/utilization';
import { completeAssignment } from '@/lib/utilization-actions';
import { formatKm, formatHours } from '@/lib/utilization-utils';
import { toast } from 'sonner';

interface AssignmentListProps {
  assignments: AssetAssignment[];
  onAssignmentCompleted?: () => void;
}

export function AssignmentList({ assignments, onAssignmentCompleted }: AssignmentListProps) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssetAssignment | null>(null);
  const [endKm, setEndKm] = useState<number | undefined>();
  const [endHours, setEndHours] = useState<number | undefined>();

  function handleCompleteClick(assignment: AssetAssignment) {
    setSelectedAssignment(assignment);
    setEndKm(assignment.startKm);
    setEndHours(assignment.startHours);
    setShowCompleteDialog(true);
  }

  async function handleComplete() {
    if (!selectedAssignment) return;

    setCompleting(selectedAssignment.id);
    try {
      const result = await completeAssignment({
        assignmentId: selectedAssignment.id,
        endKm,
        endHours,
      });

      if (result.success) {
        toast.success('Assignment completed');
        setShowCompleteDialog(false);
        onAssignmentCompleted?.();
      } else {
        toast.error(result.error || 'Failed to complete assignment');
      }
    } catch (error) {
      console.error('Error completing assignment:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setCompleting(null);
    }
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No assignments found.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Job/Target</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Start KM</TableHead>
              <TableHead className="text-right">End KM</TableHead>
              <TableHead className="text-right">KM Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => {
              const isActive = !assignment.assignedTo;
              return (
                <TableRow key={assignment.id}>
                  <TableCell className="capitalize">
                    {assignment.assignmentType.replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    {assignment.jobOrder?.jo_number || '-'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(assignment.assignedFrom), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    {assignment.assignedTo
                      ? format(new Date(assignment.assignedTo), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {assignment.startKm ? formatKm(assignment.startKm) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {assignment.endKm ? formatKm(assignment.endKm) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {assignment.kmUsed ? formatKm(assignment.kmUsed) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? 'Active' : 'Completed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteClick(assignment)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Assignment</DialogTitle>
            <DialogDescription>
              Enter the final meter readings to complete this assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endKm">End Odometer (km)</Label>
                <Input
                  id="endKm"
                  type="number"
                  value={endKm || ''}
                  onChange={(e) => setEndKm(e.target.value ? Number(e.target.value) : undefined)}
                />
                {selectedAssignment?.startKm && (
                  <p className="text-xs text-muted-foreground">
                    Start: {formatKm(selectedAssignment.startKm)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endHours">End Hour Meter</Label>
                <Input
                  id="endHours"
                  type="number"
                  step="0.1"
                  value={endHours || ''}
                  onChange={(e) => setEndHours(e.target.value ? Number(e.target.value) : undefined)}
                />
                {selectedAssignment?.startHours && (
                  <p className="text-xs text-muted-foreground">
                    Start: {formatHours(selectedAssignment.startHours)}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={completing !== null}>
              {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
