'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AssignmentStatusBadge } from '@/components/ui/resource-status-badge'
import {
  AssignmentWithDetails,
  AssignmentStatus,
  ASSIGNMENT_STATUS_LABELS,
} from '@/types/resource-scheduling'
import { updateAssignmentStatus, deleteAssignment } from '@/lib/resource-scheduling-actions'
import { formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import { MoreHorizontal, Play, CheckCircle, XCircle, Trash2, Clock, MapPin } from 'lucide-react'

interface AssignmentListProps {
  assignments: AssignmentWithDetails[]
  showResource?: boolean
  showTarget?: boolean
}

export function AssignmentList({
  assignments,
  showResource = true,
  showTarget = true,
}: AssignmentListProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)

  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter === 'all') return true
    return a.status === statusFilter
  })

  const handleStatusChange = async (id: string, status: AssignmentStatus) => {
    setLoading(id)
    try {
      await updateAssignmentStatus(id, status)
      toast.success('Status updated')
      router.refresh()
    } catch (_error) {
      toast.error('Failed to update status')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    setLoading(id)
    try {
      await deleteAssignment(id)
      toast.success('Assignment deleted')
      router.refresh()
    } catch (_error) {
      toast.error('Failed to delete assignment')
    } finally {
      setLoading(null)
    }
  }

  const getTargetLabel = (assignment: AssignmentWithDetails): string => {
    if (assignment.project) return `Project: ${assignment.project.name}`
    if (assignment.job_order) return `JO: ${assignment.job_order.jo_number}`
    if (assignment.assessment) return `Assessment: ${assignment.assessment.assessment_number}`
    if (assignment.route_survey) return `Survey: ${assignment.route_survey.survey_number}`
    if (assignment.jmp) return `JMP: ${assignment.jmp.jmp_number}`
    return 'Unknown'
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredAssignments.length} assignment(s)
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {showResource && <TableHead>Resource</TableHead>}
              {showTarget && <TableHead>Target</TableHead>}
              <TableHead>Task</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssignments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showResource && showTarget ? 7 : showResource || showTarget ? 6 : 5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  {showResource && (
                    <TableCell>
                      {assignment.resource ? (
                        <div>
                          <p className="font-medium">{assignment.resource.resource_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {assignment.resource.resource_code}
                          </p>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  )}
                  {showTarget && <TableCell>{getTargetLabel(assignment)}</TableCell>}
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="truncate">{assignment.task_description || '-'}</p>
                      {assignment.work_location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {assignment.work_location}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(assignment.start_date)}</p>
                      <p className="text-muted-foreground">to {formatDate(assignment.end_date)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {assignment.planned_hours || 0}h
                      {assignment.actual_hours !== undefined && assignment.actual_hours !== null && (
                        <span className="text-muted-foreground">
                          / {assignment.actual_hours}h actual
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AssignmentStatusBadge status={assignment.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={loading === assignment.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {assignment.status === 'scheduled' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(assignment.id, 'in_progress')}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </DropdownMenuItem>
                        )}
                        {(assignment.status === 'scheduled' ||
                          assignment.status === 'in_progress') && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(assignment.id, 'completed')}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(assignment.id, 'cancelled')}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
