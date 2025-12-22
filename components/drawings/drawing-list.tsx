'use client';

// Drawing List Component
// Displays drawing register table with search and filters

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DrawingWithDetails,
  DrawingCategory,
  DrawingFilters,
  DrawingStatus,
  STATUS_LABELS,
} from '@/types/drawing';
import { getStatusColor, formatDrawingDate } from '@/lib/drawing-utils';
import { Search, FileText, ExternalLink, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

interface DrawingListProps {
  drawings: DrawingWithDetails[];
  categories: DrawingCategory[];
  projects: Project[];
  filters: DrawingFilters;
  onFiltersChange: (filters: DrawingFilters) => void;
}

export function DrawingList({
  drawings,
  categories,
  projects,
  filters,
  onFiltersChange,
}: DrawingListProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      category_id: value === 'all' ? undefined : value,
    });
  };

  const handleProjectChange = (value: string) => {
    onFiltersChange({
      ...filters,
      project_id: value === 'all' ? undefined : value,
    });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : (value as DrawingStatus),
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.search ||
    filters.category_id ||
    filters.project_id ||
    filters.status;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Drawing Register
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  Active
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by drawing number or title..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={filters.category_id || 'all'}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.category_code} - {cat.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <Select
                  value={filters.project_id || 'all'}
                  onValueChange={handleProjectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="md:col-span-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        {drawings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No drawings found.</p>
            {hasActiveFilters && (
              <p className="text-sm mt-1">
                Try adjusting your filters or search terms.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drawing No.</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drawings.map((drawing) => (
                  <TableRow key={drawing.id}>
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/engineering/drawings/${drawing.id}`}
                        className="hover:underline text-primary"
                      >
                        {drawing.drawing_number}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {drawing.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {drawing.category?.category_code || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {drawing.project?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        Rev {drawing.current_revision}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(getStatusColor(drawing.status))}>
                        {STATUS_LABELS[drawing.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDrawingDate(drawing.updated_at)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/engineering/drawings/${drawing.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Results count */}
        {drawings.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
