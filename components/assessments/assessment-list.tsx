'use client';

// components/assessments/assessment-list.tsx
// Assessment list with filters for Technical Assessments module (v0.58)

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  ArrowUpDown,
  X
} from 'lucide-react';
import {
  TechnicalAssessment,
  TechnicalAssessmentType,
  AssessmentStatus,
  AssessmentFilters,
} from '@/types/assessment';
import {
  getStatusColor,
  getStatusLabel,
  formatDate,
} from '@/lib/assessment-utils';
import { deleteAssessment } from '@/lib/assessment-actions';
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

interface AssessmentListProps {
  assessments: TechnicalAssessment[];
  assessmentTypes: TechnicalAssessmentType[];
  filters: AssessmentFilters;
  onFiltersChange: (filters: AssessmentFilters) => void;
}

type SortField = 'assessment_number' | 'title' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

export function AssessmentList({
  assessments,
  assessmentTypes,
  filters,
  onFiltersChange,
}: AssessmentListProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedAssessments = [...assessments].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'assessment_number':
        comparison = a.assessment_number.localeCompare(b.assessment_number);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteAssessment(deleteId);
      router.refresh();
    } catch (error) {
      console.error('Error deleting assessment:', error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.assessment_type_id || filters.status || filters.search;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.assessment_type_id || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              assessment_type_id: value === 'all' ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Assessment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {assessmentTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.type_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: value === 'all' ? undefined : (value as AssessmentStatus),
            })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="superseded">Superseded</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('assessment_number')}
              >
                <div className="flex items-center gap-1">
                  Number
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Title
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Created
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAssessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No assessments found
                </TableCell>
              </TableRow>
            ) : (
              sortedAssessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/engineering/assessments/${assessment.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {assessment.assessment_number}
                    </Link>
                  </TableCell>
                  <TableCell>{assessment.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {assessment.assessment_type?.type_name || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{assessment.customer?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(assessment.status)}>
                      {getStatusLabel(assessment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(assessment.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link href={`/engineering/assessments/${assessment.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {['draft', 'in_progress', 'rejected'].includes(assessment.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link href={`/engineering/assessments/${assessment.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {assessment.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(assessment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assessment? This action cannot be undone.
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
