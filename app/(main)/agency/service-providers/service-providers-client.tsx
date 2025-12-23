'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Star } from 'lucide-react';
import { ServiceProvider, ProviderType, PROVIDER_TYPES, PROVIDER_TYPE_LABELS } from '@/types/agency';
import { getServiceProviders, deleteServiceProvider } from '@/app/actions/agency-actions';
import { ServiceProviderSummaryCards } from '@/components/agency/service-provider-summary-cards';
import { ServiceProviderCard } from '@/components/agency/service-provider-card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ServiceProviderStats {
  totalProviders: number;
  preferredCount: number;
  averageRating: number;
  typesCount: number;
}

function calculateServiceProviderStats(providers: ServiceProvider[]): ServiceProviderStats {
  const activeProviders = providers.filter(p => p.isActive);
  
  const totalProviders = activeProviders.length;
  const preferredCount = activeProviders.filter(p => p.isPreferred).length;
  
  const providersWithRating = activeProviders.filter(p => p.serviceRating !== undefined && p.serviceRating !== null);
  const averageRating = providersWithRating.length > 0
    ? Math.round((providersWithRating.reduce((sum, p) => sum + (p.serviceRating || 0), 0) / providersWithRating.length) * 100) / 100
    : 0;
  
  const types = new Set(activeProviders.map(p => p.providerType));
  const typesCount = types.size;
  
  return {
    totalProviders,
    preferredCount,
    averageRating,
    typesCount,
  };
}

export function ServiceProvidersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [stats, setStats] = useState<ServiceProviderStats>({
    totalProviders: 0,
    preferredCount: 0,
    averageRating: 0,
    typesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [preferredOnly, setPreferredOnly] = useState(searchParams.get('preferred') === 'true');
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('type') || 'all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ServiceProvider | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getServiceProviders();
      if (result.success && result.data) {
        setServiceProviders(result.data);
        setStats(calculateServiceProviderStats(result.data));
      }
    } catch (error) {
      console.error('Failed to load service providers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load service providers',
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
    if (selectedType && selectedType !== 'all') params.set('type', selectedType);

    const queryString = params.toString();
    const newUrl = queryString ? `/agency/service-providers?${queryString}` : '/agency/service-providers';
    router.replace(newUrl, { scroll: false });
  }, [search, preferredOnly, selectedType, router]);

  // Filter service providers
  const filteredProviders = useMemo(() => {
    return serviceProviders.filter((provider) => {
      const matchesSearch = !search || 
        provider.providerName.toLowerCase().includes(search.toLowerCase()) ||
        provider.providerCode.toLowerCase().includes(search.toLowerCase()) ||
        provider.city?.toLowerCase().includes(search.toLowerCase()) ||
        provider.province?.toLowerCase().includes(search.toLowerCase());
      
      const matchesPreferred = !preferredOnly || provider.isPreferred;
      
      const matchesType = selectedType === 'all' || provider.providerType === selectedType;
      
      return matchesSearch && matchesPreferred && matchesType;
    });
  }, [serviceProviders, search, preferredOnly, selectedType]);

  // Group providers by type for display
  const groupedProviders = useMemo(() => {
    const groups = new Map<ProviderType, ServiceProvider[]>();
    filteredProviders.forEach(provider => {
      const existing = groups.get(provider.providerType) || [];
      groups.set(provider.providerType, [...existing, provider]);
    });
    return groups;
  }, [filteredProviders]);

  const handleDeleteClick = (provider: ServiceProvider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!providerToDelete) return;
    
    const result = await deleteServiceProvider(providerToDelete.id);
    if (result.success) {
      loadData();
      toast({
        title: 'Success',
        description: 'Service provider deleted',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete service provider',
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
    setProviderToDelete(null);
  };

  const clearFilters = () => {
    setSearch('');
    setPreferredOnly(false);
    setSelectedType('all');
  };

  const hasActiveFilters = search || preferredOnly || selectedType !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Providers</h1>
          <p className="text-muted-foreground">
            Manage trucking, warehousing, surveyor, and other logistics partners
          </p>
        </div>
        <Button onClick={() => router.push('/agency/service-providers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service Provider
        </Button>
      </div>

      {/* Summary Cards */}
      <ServiceProviderSummaryCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PROVIDER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {PROVIDER_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Toggle
          pressed={preferredOnly}
          onPressedChange={setPreferredOnly}
          aria-label="Show preferred only"
          className="gap-2"
        >
          <Star className="h-4 w-4" />
          Preferred Only
        </Toggle>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Service Providers Grid - Grouped by Type */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading service providers...
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {serviceProviders.length === 0 
            ? 'No service providers found. Add your first service provider to get started.'
            : 'No service providers match your filters.'}
        </div>
      ) : selectedType !== 'all' ? (
        // Show flat grid when filtering by type
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => (
            <ServiceProviderCard
              key={provider.id}
              serviceProvider={provider}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        // Show grouped by type when showing all
        <div className="space-y-8">
          {Array.from(groupedProviders.entries())
            .sort(([a], [b]) => PROVIDER_TYPE_LABELS[a].localeCompare(PROVIDER_TYPE_LABELS[b]))
            .map(([type, providers]) => (
              <div key={type} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{PROVIDER_TYPE_LABELS[type]}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({providers.length} provider{providers.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {providers.map((provider) => (
                    <ServiceProviderCard
                      key={provider.id}
                      serviceProvider={provider}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{providerToDelete?.providerName}&quot;? 
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
