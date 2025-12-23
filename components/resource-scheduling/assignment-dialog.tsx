'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AssignmentStatusBadge,
  UnavailabilityTypeBadge,
} from '@/components/ui/resource-status-badge'
import {
  EngineeringResource,
  CalendarCell,
  ResourceAssignment,
  AssignmentTargetType,
  ASSIGNMENT_TARGET_LABELS,
} from '@/types/resource-scheduling'
import { createAssignment, updateAssignmentStatus, deleteAssignment } from '@/lib/resource-scheduling-actions'
import { toast } from 'sonner'
import { formatDate } from '@/lib/pjo-utils'
import { Loader2, Trash2, Clock, MapPin } from 'lucide-react'

interface AssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: EngineeringResource
  date: string
  cell: CalendarCell
  onSuccess: () => void
}

export function AssignmentDialog({
  open,
  onOpenChange,
  resource,
  date,
  cell,
  onSuccess,
}: AssignmentDialogProps) {
  const [mode, setMode] = useState<'view' | 'create'>('view')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    target_type: 'project' as AssignmentTargetType,
    target_id: '',
    task_description: '',
    start_date: date,
    end_date: date,
    planned_hours: resource.daily_capacity.toString(),
    work_location: '',
    notes: '',
  })

  const handleCreate = async () => {
    if (!formData.target_id) {
      toast.error('Please select a target')
      return
    }

    setLoading(true)
    try {
      const result = await createAssignment({
        resource_id: resource.id,
        target_type: formData.target_type,
        target_id: formData.target_id,
        task_description: formData.task_description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        planned_hours: parseFloat(formData.planned_hours) || undefined,
        work_location: formData.work_location || undefined,
        notes: formData.notes || undefined,
      })

      if (result.conflicts?.has_conflict) {
        toast.error(`Assignment created with ${result.conflicts.conflicts.length} conflict(s)`)
      } else {
        toast.success('Assignment created successfully')
      }
      onSuccess()
    } catch (error) {
      toast.error('Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (assignmentId: string, status: string) => {
    setLoading(true)
    try {
      await updateAssignmentStatus(assignmentId, status as any)
      toast.success('Status updated')
      onSuccess()
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    setLoading(true)
    try {
      await deleteAssignment(assignmentId)
      toast.success('Assignment deleted')
      onSuccess()
    } catch (error) {
      toast.error('Failed to delete assignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {resource.resource_name} - {formatDate(date)}
          </DialogTitle>
        </DialogHeader>

        {/* Unavailable state */}
        {!cell.is_available && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Status:</span>
              <UnavailabilityTypeBadge type={cell.unavailability_type!} />
            </div>
            <p className="text-sm text-muted-foreground">
              This resource is unavailable on this date.
            </p>
          </div>
        )}

        {/* Available state */}
        {cell.is_available && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 py-2 text-sm">
              <div>
                <span className="text-muted-foreground">Available</span>
                <p className="font-medium">{cell.available_hours}h</p>
              </div>
              <div>
                <span className="text-muted-foreground">Assigned</span>
                <p className="font-medium">{cell.assigned_hours.toFixed(1)}h</p>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining</span>
                <p className="font-medium">{cell.remaining_hours.toFixed(1)}h</p>
              </div>
            </div>

            {/* Existing assignments */}
            {cell.assignments.length > 0 && mode === 'view' && (
              <div className="space-y-3">
                <h4 className="font-medium">Assignments</h4>
                {cell.assignments.map((assignment) => (
                  <AssignmentItem
                    key={assignment.id}
                    assignment={assignment}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    loading={loading}
                  />
                ))}
              </div>
            )}

            {/* Create form */}
            {mode === 'create' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Type</Label>
                    <Select
                      value={formData.target_type}
                      onValueChange={(v) =>
                        setFormData({ ...formData, target_type: v as AssignmentTargetType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ASSIGNMENT_TARGET_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target ID *</Label>
                    <Input
                      value={formData.target_id}
                      onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                      placeholder="Enter target ID"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Task Description</Label>
                  <Textarea
                    value={formData.task_description}
                    onChange={(e) =>
                      setFormData({ ...formData, task_description: e.target.value })
                    }
                    placeholder="Describe the task"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Planned Hours</Label>
                    <Input
                      type="number"
                      value={formData.planned_hours}
                      onChange={(e) => setFormData({ ...formData, planned_hours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Work Location</Label>
                    <Input
                      value={formData.work_location}
                      onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          {cell.is_available && (
            <>
              {mode === 'view' ? (
                <Button onClick={() => setMode('create')}>New Assignment</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setMode('view')}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Assignment
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AssignmentItem({
  assignment,
  onStatusChange,
  onDelete,
  loading,
}: {
  assignment: ResourceAssignment
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  loading: boolean
}) {
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <AssignmentStatusBadge status={assignment.status} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(assignment.id)}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {assignment.task_description && (
        <p className="text-sm">{assignment.task_description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {assignment.planned_hours && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {assignment.planned_hours}h
          </span>
        )}
        {assignment.work_location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {assignment.work_location}
          </span>
        )}
      </div>

      {assignment.status !== 'completed' && assignment.status !== 'cancelled' && (
        <div className="flex gap-2 pt-2">
          {assignment.status === 'scheduled' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(assignment.id, 'in_progress')}
              disabled={loading}
            >
              Start
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onStatusChange(assignment.id, 'completed')}
            disabled={loading}
          >
            Complete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onStatusChange(assignment.id, 'cancelled')}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
