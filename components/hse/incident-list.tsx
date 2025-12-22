'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { Incident, IncidentStatus, IncidentSeverity } from '@/types/incident';
import { IncidentCard } from './incident-card';
import { getStatusLabel, getSeverityLabel } from '@/lib/incident-utils';

interface IncidentListProps {
  incidents: Incident[];
  showFilters?: boolean;
}

const statusOptions: IncidentStatus[] = ['reported', 'under_investigation', 'pending_actions', 'closed', 'rejected'];
const severityOptions: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

export function IncidentList({ incidents, showFilters = true }: IncidentListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredIncidents = incidents.filter((incident) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        incident.title.toLowerCase().includes(searchLower) ||
        incident.incidentNumber.toLowerCase().includes(searchLower) ||
        incident.description.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && incident.status !== statusFilter) {
      return false;
    }

    // Severity filter
    if (severityFilter !== 'all' && incident.severity !== severityFilter) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSeverityFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || severityFilter !== 'all';

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari insiden..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Severity</SelectItem>
              {severityOptions.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {getSeverityLabel(severity)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {filteredIncidents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Tidak ada insiden ditemukan</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Hapus filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIncidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
