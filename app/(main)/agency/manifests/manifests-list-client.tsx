'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManifestCard } from '@/components/agency/manifest-card';
import {
  CargoManifest,
  ManifestStatus,
  ManifestType,
  MANIFEST_STATUSES,
  MANIFEST_STATUS_LABELS,
  MANIFEST_TYPES,
  MANIFEST_TYPE_LABELS,
} from '@/types/agency';
import { getCargoManifests, submitManifest } from '@/app/actions/bl-documentation-actions';
import { 
  Plus, 
  Search, 
  X, 
  Loader2, 
  FileText, 
  Send, 
  CheckCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ManifestStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  inward: number;
  outward: number;
}

interface ManifestsFilters {
  search?: string;
  status?: ManifestStatus;
  manifestType?: ManifestType;
  dateFrom?: string;
  dateTo?: string;
}

interface ManifestsListClientProps {
  initialManifests: CargoManifest[];
  initialStats: ManifestStats;
}

export function ManifestsListClient({
  initialManifests,
  initialStats,
}: ManifestsListClientProps) {
  const [manifests, setManifests] = useState<CargoManifest[]>(initialManifests);
  const [stats] = useState<ManifestStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState<ManifestsFilters>({
    search: '',
    status: undefined,
    manifestType: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });
  const { toast } = useToast();

  // Submit dialog state
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [manifestToSubmit, setManifestToSubmit] = useState<CargoManifest | null>(null);
  const [submittedTo, setSubmittedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await getCargoManifests(filters);
      setManifests(results);
    } catch (error) {
      console.error('Failed to search manifests:', error);
      toast({
        title: 'Error',
        description: 'Failed to search cargo manifests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  const handleFilterChange = (key: keyof ManifestsFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    const clearedFilters: ManifestsFilters = {
      search: '',
      status: undefined,
      manifestType: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setFilters(clearedFilters);
    setIsLoading(true);
    try {
      const results = await getCargoManifests(clearedFilters);
      setManifests(results);
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitClick = (manifest: CargoManifest) => {
    setManifestToSubmit(manifest);
    setSubmittedTo('');
    setSubmitDialogOpen(true);
  };

  const handleSubmitManifest = async () => {
    if (!manifestToSubmit || !submittedTo.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the authority/entity to submit to',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitManifest(manifestToSubmit.id, submittedTo);
      if (result.success) {
        toast({
          title: 'Success',
          description: `Manifest ${manifestToSubmit.manifestNumber} submitted successfully`,
        });
        setSubmitDialogOpen(false);
        // Refresh the list
        handleSearch();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit manifest',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to submit manifest:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit manifest',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.manifestType ||
    filters.dateFrom ||
    filters.dateTo;

  // Filter manifests based on active tab
  const getFilteredManifests = () => {
    switch (activeTab) {
      case 'draft':
        return manifests.filter(m => m.status === 'draft');
      case 'submitted':
        return manifests.filter(m => m.status === 'submitted');
      case 'approved':
        return manifests.filter(m => m.status === 'approved');
      case 'inward':
        return manifests.filter(m => m.manifestType === 'inward');
      case 'outward':
        return manifests.filter(m => m.manifestType === 'outward');
      default:
        return manifests;
    }
  };

  const filteredManifests = getFilteredManifests();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cargo Manifests</h1>
          <p className="text-muted-foreground">
            Create and manage cargo manifests for customs submission
          </p>
        </div>
        <Link href="/agency/manifests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Manifest
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inward</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inward}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outward</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outward}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by manifest number, vessel..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="w-[150px]">
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              handleFilterChange('status', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {MANIFEST_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {MANIFEST_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[150px]">
          <Select
            value={filters.manifestType || 'all'}
            onValueChange={(value) =>
              handleFilterChange('manifestType', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {MANIFEST_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {MANIFEST_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[150px]">
          <Input
            type="date"
            placeholder="From Date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>

        <div className="w-[150px]">
          <Input
            type="date"
            placeholder="To Date"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>

        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={handleClearFilters} disabled={isLoading}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Draft ({stats.draft})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Submitted ({stats.submitted})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({stats.approved})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredManifests.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No cargo manifests found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={handleClearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
              {!hasActiveFilters && (
                <Link href="/agency/manifests/new">
                  <Button variant="link" className="mt-2">
                    Create your first manifest
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredManifests.map((manifest) => (
                <ManifestCard
                  key={manifest.id}
                  manifest={manifest}
                  onSubmit={handleSubmitClick}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Results count */}
      {!isLoading && filteredManifests.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredManifests.length} manifest{filteredManifests.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Manifest</DialogTitle>
            <DialogDescription>
              Submit manifest {manifestToSubmit?.manifestNumber} to customs or port authority.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="submittedTo">Submit To *</Label>
              <Input
                id="submittedTo"
                placeholder="e.g., Port Authority, Customs Office"
                value={submittedTo}
                onChange={(e) => setSubmittedTo(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Enter the authority or entity this manifest is being submitted to
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitManifest} disabled={isSubmitting || !submittedTo.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
