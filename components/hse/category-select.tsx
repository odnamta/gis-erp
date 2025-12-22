'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IncidentCategory } from '@/types/incident';

interface CategorySelectProps {
  categories: IncidentCategory[];
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function CategorySelect({
  categories,
  value,
  onValueChange,
  disabled,
}: CategorySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Pilih kategori insiden" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex flex-col">
              <span>{category.categoryName}</span>
              {category.description && (
                <span className="text-xs text-muted-foreground">
                  {category.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
