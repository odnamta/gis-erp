'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Filter, X } from 'lucide-react';
import { AssetAvailability } from '@/types/utilization';
import {
  getAvailabilityBadgeVariant,
  getAvailabilityStatusLabel,
} from '@/lib/utilization-utils';

interface AssetCategory {
  id: string;
  category_name: string;
}

interface AvailabilityListProps {
  assets: AssetAvailability[];
  categories: AssetCategory[];
  selectedCategoryId?: string;
  onCategoryChange: (categoryId?: string) => void;
}

export function AvailabilityList({
  assets,
  categories,
  selectedCategoryId,
  onCategoryChange,
}: AvailabilityListProps) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const availableCount = assets.filter((a) => a.availabilityStatus === 'available').length;
  const assignedCount = assets.filter((a) => a.availabilityStatus === 'assigned').length;
  const unavailableCount = assets.filter((a) => a.availabilityStatus === 'unavailable').length;

  const handleQuickAssign = (assetId: string) => {
    router.push(`/equipment/${assetId}/assign`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Asset Availability</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {availableCount} available • {assignedCount} assigned • {unavailableCount} unavailable
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filter
          {selectedCategoryId && (
            <Badge variant="secondary" className="ml-1">1</Badge>
          )}
        </Button>
      </CardHeader>

      {showFilters && (
        <CardContent className="border-b pb-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label>Category</Label>
              <Select
                value={selectedCategoryId || 'all'}
                onValueChange={(v) => onCategoryChange(v === 'all' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategoryId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCategoryChange(undefined)}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      )}

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Job</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono">{asset.assetCode}</TableCell>
                  <TableCell>{asset.assetName}</TableCell>
                  <TableCell>{asset.categoryName}</TableCell>
                  <TableCell>{asset.registrationNumber || '-'}</TableCell>
                  <TableCell>
                    {asset.capacityTons ? `${asset.capacityTons} tons` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getAvailabilityBadgeVariant(asset.availabilityStatus)}>
                      {getAvailabilityStatusLabel(asset.availabilityStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>{asset.currentJob || '-'}</TableCell>
                  <TableCell>
                    {asset.availabilityStatus === 'available' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickAssign(asset.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
