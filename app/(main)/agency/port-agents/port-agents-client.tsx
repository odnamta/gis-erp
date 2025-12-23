'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Star, Filter } from 'lucide-react';
import { PortAgent, PortAgentStats, Port, PortAgentService, PORT_AGENT_SERVICES, PORT_AGENT_SERVICE_LABELS } from '@/types/agency';
import { getPortAgents, getPorts, deletePortAgent } from '@/app/actions/agency-actions';
import { calculatePortAgentStats } from '@/lib/agency-utils';
import { groupAgentsByCountry } from '@/lib/agent-search-utils';
import { PortAgentSummaryCards } from '@/components/agency/port-agent-summary-cards';
import { PortAgentCard } from '@/components/agency/port-agent-card';
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function PortAgentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [portAgents, setPortAgents] = useState<PortAgent[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [stats, setStats] = useState<PortAgentStats>({
    totalAgents: 0,
    preferredCount: 0,
    averageRating: 0,
    countriesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [preferredOnly, setPreferredOnly] = useState(searchParams.get('preferred') === 'true');
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || 'all');
  const [selectedPort, setSelectedPort] = useState(searchParams.get('port') || 'all');
  const [selectedServices, setSelectedServices] = useState<PortAgentService[]>(
    searchParams.get('services')?.split(',').filter(Boolean) as PortAgentService[] || []
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<PortAgent | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsResult, portsResult] = await Promise.all([
        getPortAgents(),
        getPorts(),
      ]);
      
      if (agentsResult.success && agentsResult.data) {
        setPortAgents(agentsResult.data);
        setStats(calculatePortAgentStats(agentsResult.data));
      }
      
      if (portsResult.success && portsResult.data) {
        setPorts(portsResult.data);
      }
    } catch (error) {
      console.error('Failed to load port agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load port agents',
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
    if (selectedCountry && selectedCountry !== 'all') params.set('country', selectedCountry);
    if (selectedPort && selectedPort !== 'all') params.set('port', selectedPort);
    if (selectedServices.length > 0) params.set('services', selectedServices.join(','));

    const queryString = params.toString();
    const newUrl = queryString ? `/agency/port-agents?${queryString}` : '/agency/port-agents';
    router.replace(newUrl, { scroll: false });
  }, [search, preferredOnly, selectedCountry, selectedPort, selectedServices, router]);

  // Get unique countries from agents
  const countries = useMemo(() => {
    const countrySet = new Set(portAgents.map(a => a.portCountry));
    return Array.from(countrySet).sort();
  }, [portAgents]);

  // Filter port agents
  const filteredAgents = useMemo(() => {
    return portAgents.filter((agent) => {
      const matchesSearch = !search || 
        agent.agentName.toLowerCase().includes(search.toLowerCase()) ||
        agent.agentCode.toLowerCase().includes(search.toLowerCase()) ||
        agent.portName.toLowerCase().includes(search.toLowerCase());
      
      const matchesPreferred = !preferredOnly || agent.isPreferred;
      
      const matchesCountry = selectedCountry === 'all' || agent.portCountry === selectedCountry;
      
      const matchesPort = selectedPort === 'all' || agent.portId === selectedPort;
      
      const matchesServices = selectedServices.length === 0 || 
        selectedServices.every(service => agent.services.includes(service));
      
      return matchesSearch && matchesPreferred && matchesCountry && matchesPort && matchesServices;
    });
  }, [portAgents, search, preferredOnly, selectedCountry, selectedPort, selectedServices]);

  // Group filtered agents by country
  const groupedAgents = useMemo(() => {
    return groupAgentsByCountry(filteredAgents);
  }, [filteredAgents]);

  const handleDeleteClick = (agent: PortAgent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return;
    
    const result = await deletePortAgent(agentToDelete.id);
    if (result.success) {
      loadData();
      toast({
        title: 'Success',
        description: 'Port agent deleted',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete port agent',
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
    setAgentToDelete(null);
  };

  const handleServiceToggle = (service: PortAgentService) => {
    setSelectedServices(prev => 
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setPreferredOnly(false);
    setSelectedCountry('all');
    setSelectedPort('all');
    setSelectedServices([]);
  };

  const hasActiveFilters = search || preferredOnly || selectedCountry !== 'all' || selectedPort !== 'all' || selectedServices.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Port Agents</h1>
          <p className="text-muted-foreground">
            Manage port agents for customs clearance and handling services
          </p>
        </div>
        <Button onClick={() => router.push('/agency/port-agents/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Port Agent
        </Button>
      </div>

      {/* Summary Cards */}
      <PortAgentSummaryCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or port..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPort} onValueChange={setSelectedPort}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Ports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ports</SelectItem>
            {ports.map((port) => (
              <SelectItem key={port.id} value={port.id}>
                {port.portName} ({port.portCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Services
              {selectedServices.length > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                  {selectedServices.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Services</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PORT_AGENT_SERVICES.map((service) => (
              <DropdownMenuCheckboxItem
                key={service}
                checked={selectedServices.includes(service)}
                onCheckedChange={() => handleServiceToggle(service)}
              >
                {PORT_AGENT_SERVICE_LABELS[service]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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

      {/* Port Agents Grid - Grouped by Country */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading port agents...
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {portAgents.length === 0 
            ? 'No port agents found. Add your first port agent to get started.'
            : 'No port agents match your filters.'}
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groupedAgents.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([country, agents]) => (
              <div key={country} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{country}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({agents.length} agent{agents.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent) => (
                    <PortAgentCard
                      key={agent.id}
                      portAgent={agent}
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
            <AlertDialogTitle>Delete Port Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{agentToDelete?.agentName}&quot;? 
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
