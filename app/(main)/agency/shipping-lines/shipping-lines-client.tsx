'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Star } from 'lucide-react';
import { ShippingLine, ShippingLineStats } from '@/types/agency';
import { getShippingLines, toggleShippingLinePreferred, deleteShippingLine } from '@/app/actions/agency-actions';
import { calculateShippingLineStats } from '@/lib/agency-utils';
import { ShippingLineSummaryCards } from '@/components/agency/shipping-line-summary-cards';
import { ShippingLineCard } from '@/components/agency/shipping-line-card';
import { Toggle } from '@/components/ui/toggle';
import { useToast } from '@/hooks/use-toast';
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

export function ShippingLinesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [stats, setStats] = useState<ShippingLineStats>({
    totalLines: 0,
    preferredCount: 0,
    averageRating: 0,
    totalCreditLimit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [preferredOnly, setPreferredOnly] = useState(searchParams.get('preferred') === 'true');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<ShippingLine | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getShippingLines();
      if (result.success && result.data) {
        setShippingLines(result.data);
        setStats(calculateShippingLineStats(result.data));
      }
    } catch (error) {
      console.error('Failed to load shipping lines:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipping lines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (preferredOnly) params.set('preferred', 'true');

    const queryString = params.toString();
    const newUrl = queryString ? `/agency/shipping-lines?${queryString}` : '/agency/shipping-lines';
    router.replace(newUrl, { scroll: false });
  }, [search, preferredOnly, router]);

  // Filter shipping lines
  const filteredLines = shippingLines.filter((line) => {
    const matchesSearch = !search || 
      line.lineName.toLowerCase().includes(search.toLowerCase()) ||
      line.lineCode.toLowerCase().includes(search.toLowerCase()) ||
      line.localAgentName?.toLowerCase().includes(search.toLowerCase());
    
    const matchesPreferred = !preferredOnly || line.isPreferred;
    
    return matchesSearch && matchesPreferred;
  });

  const handleTogglePreferred = async (id: string) => {
    const result = await toggleShippingLinePreferred(id);
    if (result.success) {
      loadData();
      toast({
        title: 'Success',
        description: 'Preferred status updated',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update preferred status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (line: ShippingLine) => {
    setLineToDelete(line);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!lineToDelete) return;
    
    const result = await deleteShippingLine(lineToDelete.id);
    if (result.success) {
      loadData();
      toast({
        title: 'Success',
        description: 'Shipping line deleted',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete shipping line',
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
    setLineToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping Lines</h1>
          <p className="text-muted-foreground">
            Manage shipping line partners for freight operations
          </p>
        </div>
        <Button onClick={() => router.push('/agency/shipping-lines/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shipping Line
        </Button>
      </div>

      {/* Summary Cards */}
      <ShippingLineSummaryCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Toggle
          pressed={preferredOnly}
          onPressedChange={setPreferredOnly}
          aria-label="Show preferred only"
          className="gap-2"
        >
          <Star className="h-4 w-4" />
          Preferred Only
        </Toggle>
      </div>

      {/* Shipping Lines Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading shipping lines...
        </div>
      ) : filteredLines.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {shippingLines.length === 0 
            ? 'No shipping lines found. Add your first shipping line to get started.'
            : 'No shipping lines match your filters.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLines.map((line) => (
            <ShippingLineCard
              key={line.id}
              shippingLine={line}
              onTogglePreferred={handleTogglePreferred}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Line</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{lineToDelete?.lineName}&quot;? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
