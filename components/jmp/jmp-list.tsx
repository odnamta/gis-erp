'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Search } from 'lucide-react';
import { JmpWithRelations, JmpFilters } from '@/types/jmp';
import { formatJmpStatus, getJmpStatusColor } from '@/lib/jmp-utils';

interface JmpListProps {
  jmps: JmpWithRelations[];
  customers: { id: string; name: string }[];
  onFilterChange: (filters: JmpFilters) => void;
}

export function JmpList({ jmps, customers, onFilterChange }: JmpListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<JmpFilters>({
    status: 'all',
    customerId: 'all',
    search: '',
  });

  const handleFilterChange = (key: keyof JmpFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by JMP number or title..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.customerId}
          onValueChange={(value) => handleFilterChange('customerId', value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>JMP Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Planned Departure</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jmps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No journey management plans found
                </TableCell>
              </TableRow>
            ) : (
              jmps.map((jmp) => (
                <TableRow
                  key={jmp.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/engineering/jmp/${jmp.id}`)}
                >
                  <TableCell className="font-medium">{jmp.jmpNumber}</TableCell>
                  <TableCell>{jmp.journeyTitle}</TableCell>
                  <TableCell>{jmp.customer?.name || '-'}</TableCell>
                  <TableCell className="text-sm">
                    <div>{jmp.originLocation}</div>
                    <div className="text-muted-foreground">→ {jmp.destinationLocation}</div>
                  </TableCell>
                  <TableCell>
                    {jmp.plannedDeparture
                      ? format(new Date(jmp.plannedDeparture), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getJmpStatusColor(jmp.status)}>
                      {formatJmpStatus(jmp.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/engineering/jmp/${jmp.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
