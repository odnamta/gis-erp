'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bug, Lightbulb, AlertTriangle, CheckCircle, Clock, Search, Filter, Copy, ClipboardCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllFeedback, getFeedbackSummary } from '@/app/actions/feedback';
import {
  getStatusVariant,
  getStatusLabel,
  getFeedbackTypeLabel,
  getSeverityColor,
  formatFeedbackDate,
  getStatusOptions,
  getSeverityOptions,
  getModuleOptions,
} from '@/lib/feedback-utils';
import type {
  FeedbackType,
  FeedbackStatus,
  Severity,
  FeedbackListItem,
  FeedbackSummary,
  FeedbackFilters,
} from '@/types/feedback';
import { FeedbackDetailSheet } from './feedback-detail-sheet';

export function FeedbackDashboard() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [items, setItems] = useState<FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackListItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Filters
  const [filters, setFilters] = useState<FeedbackFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, feedbackResult] = await Promise.all([
        getFeedbackSummary(),
        getAllFeedback({ ...filters, search: searchTerm }, page, pageSize),
      ]);

      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }

      if (feedbackResult.success && feedbackResult.data) {
        setItems(feedbackResult.data.items);
        setTotalPages(feedbackResult.data.totalPages);
        setTotal(feedbackResult.data.total);
      }
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleFilterChange = (key: keyof FeedbackFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(1);
  };

  const handleCopyAll = async () => {
    const exportData = items.map((item) => ({
      id: item.id,
      ticket: item.ticket_number,
      user: item.submitted_by_name || item.submitted_by_email || 'Unknown',
      type: item.feedback_type,
      title: item.title,
      description: item.description || '',
      severity: item.severity || 'medium',
      module: item.module || item.affected_module || '',
      steps_to_reproduce: item.steps_to_reproduce || '',
      expected_behavior: item.expected_behavior || '',
      actual_behavior: item.actual_behavior || '',
      status: item.status,
      page_url: item.page_url || '',
      created_at: item.created_at,
    }));

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      toast({ title: `Copied ${exportData.length} feedback items to clipboard` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyNew = async () => {
    const newItems = items.filter((item) => item.status === 'new');
    const exportData = newItems.map((item) => ({
      id: item.id,
      ticket: item.ticket_number,
      user: item.submitted_by_name || item.submitted_by_email || 'Unknown',
      type: item.feedback_type,
      title: item.title,
      description: item.description || '',
      severity: item.severity || 'medium',
      module: item.module || item.affected_module || '',
      steps_to_reproduce: item.steps_to_reproduce || '',
      expected_behavior: item.expected_behavior || '',
      actual_behavior: item.actual_behavior || '',
      status: item.status,
      page_url: item.page_url || '',
      created_at: item.created_at,
    }));

    if (newItems.length === 0) {
      toast({ title: 'No new feedback to copy' });
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      toast({ title: `Copied ${exportData.length} NEW feedback items to clipboard` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground">
            Manage bug reports, improvement requests, and questions from users
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyNew}>
            {copied ? <ClipboardCheck className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy New
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            {copied ? <ClipboardCheck className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.newCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary?.criticalCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Bugs</CardTitle>
            <Bug className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.openBugsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <Lightbulb className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.openRequestsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved (7d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.resolvedThisWeekCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, or ticket..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={filters.type || 'all'}
              onValueChange={(v) => handleFilterChange('type', v as FeedbackType)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => handleFilterChange('status', v as FeedbackStatus)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {getStatusOptions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.severity || 'all'}
              onValueChange={(v) => handleFilterChange('severity', v as Severity)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {getSeverityOptions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label.split(' - ')[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.module || 'all'}
              onValueChange={(v) => handleFilterChange('module', v)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {getModuleOptions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback ({total})</CardTitle>
          <CardDescription>
            Click on a row to view details and manage the feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No feedback found matching your criteria
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedFeedback(item)}
                    >
                      <TableCell className="font-mono text-sm">
                        {item.ticket_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getFeedbackTypeLabel(item.feedback_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        {item.severity && (
                          <span className={`inline-flex items-center gap-1`}>
                            <span className={`w-2 h-2 rounded-full ${getSeverityColor(item.severity)}`} />
                            <span className="capitalize">{item.severity}</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.module || item.affected_module || '-'}</TableCell>
                      <TableCell>{formatFeedbackDate(item.created_at)}</TableCell>
                      <TableCell>{item.comment_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <FeedbackDetailSheet
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onUpdate={loadData}
      />
    </div>
  );
}
