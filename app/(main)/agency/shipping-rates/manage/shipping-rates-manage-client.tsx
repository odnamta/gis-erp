'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ArrowLeft, ArrowRight, Calendar, AlertTriangle } from 'lucide-react';
import { ShippingRate, ShippingLine, CONTAINER_TYPES } from '@/types/agency';
import { getShippingRates, getShippingLines, deleteShippingRate } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';


export function ShippingRatesManageClient() {
  const router = useRouter();
  const { toast } = useToast();

  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [containerTypeFilter, setContainerTypeFilter] = useState<string>('');
  const [shippingLineFilter, setShippingLineFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<ShippingRate | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ratesResult, linesResult] = await Promise.all([
        getShippingRates(),
        getShippingLines(),
      ]);

      if (ratesResult.success && ratesResult.data) {
        setRates(ratesResult.data);
      }
      if (linesResult.success && linesResult.data) {
        setShippingLines(linesResult.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipping rates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter rates
  const filteredRates = rates.filter((rate) => {
    const matchesSearch = !search || 
      rate.shippingLine?.lineName?.toLowerCase().includes(search.toLowerCase()) ||
      rate.originPort?.portCode?.toLowerCase().includes(search.toLowerCase()) ||
      rate.originPort?.portName?.toLowerCase().includes(search.toLowerCase()) ||
      rate.destinationPort?.portCode?.toLowerCase().includes(search.toLowerCase()) ||
      rate.destinationPort?.portName?.toLowerCase().includes(search.toLowerCase());
    
    const matchesContainerType = !containerTypeFilter || rate.containerType === containerTypeFilter;
    const matchesShippingLine = !shippingLineFilter || rate.shippingLineId === shippingLineFilter;
    
    return matchesSearch && matchesContainerType && matchesShippingLine;
  });

  const handleDeleteClick = (rate: ShippingRate) => {
    setRateToDelete(rate);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!rateToDelete) return;
    
    const result = await deleteShippingRate(rateToDelete.id);
    if (result.success) {
      loadData();
      toast({
        title: 'Success',
        description: 'Shipping rate deleted',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete shipping rate',
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
    setRateToDelete(null);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isRateExpired = (validTo: string) => {
    return new Date(validTo) < new Date();
  };

  const isRateExpiringSoon = (validTo: string) => {
    const expiryDate = new Date(validTo);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/agency/shipping-rates')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Search
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Shipping Rates</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage shipping rates
          </p>
        </div>
        <Button onClick={() => router.push('/agency/shipping-rates/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rate
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by line, port..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={containerTypeFilter} onValueChange={setContainerTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Container Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            {CONTAINER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={shippingLineFilter} onValueChange={setShippingLineFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Shipping Line" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Lines</SelectItem>
            {shippingLines.map((line) => (
              <SelectItem key={line.id} value={line.id}>
                {line.lineName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>


      {/* Rates Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading shipping rates...
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {rates.length === 0 
            ? 'No shipping rates found. Add your first rate to get started.'
            : 'No rates match your filters.'}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipping Line</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Container</TableHead>
                <TableHead className="text-right">Ocean Freight</TableHead>
                <TableHead className="text-right">Total Rate</TableHead>
                <TableHead>Transit</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRates.map((rate) => {
                const expired = isRateExpired(rate.validTo);
                const expiringSoon = isRateExpiringSoon(rate.validTo);
                
                return (
                  <TableRow 
                    key={rate.id}
                    className={expired ? 'opacity-50' : ''}
                  >
                    <TableCell>
                      <span className="font-medium">
                        {rate.shippingLine?.lineName || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <span>{rate.originPort?.portCode || 'N/A'}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{rate.destinationPort?.portCode || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {rate.originPort?.portName} → {rate.destinationPort?.portName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rate.containerType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rate.oceanFreight, rate.currency)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(rate.totalRate, rate.currency)}
                    </TableCell>
                    <TableCell>
                      {rate.transitDays ? `${rate.transitDays} days` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <div className="text-sm">
                          <div>{format(new Date(rate.validFrom), 'dd/MM/yy')}</div>
                          <div className={expired ? 'text-destructive' : expiringSoon ? 'text-orange-600' : ''}>
                            {format(new Date(rate.validTo), 'dd/MM/yy')}
                          </div>
                        </div>
                        {expired && (
                          <Badge variant="destructive" className="text-xs ml-1">
                            Expired
                          </Badge>
                        )}
                        {!expired && expiringSoon && (
                          <AlertTriangle className="h-4 w-4 text-orange-600 ml-1" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rate.terms}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/agency/shipping-rates/${rate.id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(rate)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rate from{' '}
              {rateToDelete?.shippingLine?.lineName || 'Unknown'} ({rateToDelete?.containerType})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
