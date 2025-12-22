'use client';

// Drawing Selector Component
// Multi-select component for choosing drawings for transmittals

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DrawingWithDetails, TransmittalDrawingItem } from '@/types/drawing';
import { Search, Plus, Minus } from 'lucide-react';

interface DrawingSelectorProps {
  drawings: DrawingWithDetails[];
  selectedDrawings: TransmittalDrawingItem[];
  onSelectionChange: (items: TransmittalDrawingItem[]) => void;
}

export function DrawingSelector({
  drawings,
  selectedDrawings,
  onSelectionChange,
}: DrawingSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredDrawings = drawings.filter((d) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      d.drawing_number.toLowerCase().includes(searchLower) ||
      d.title.toLowerCase().includes(searchLower)
    );
  });

  const isSelected = (drawingId: string) =>
    selectedDrawings.some((d) => d.drawing_id === drawingId);

  const getSelectedItem = (drawingId: string) =>
    selectedDrawings.find((d) => d.drawing_id === drawingId);

  const handleToggle = (drawing: DrawingWithDetails) => {
    if (isSelected(drawing.id)) {
      onSelectionChange(selectedDrawings.filter((d) => d.drawing_id !== drawing.id));
    } else {
      onSelectionChange([
        ...selectedDrawings,
        {
          drawing_id: drawing.id,
          drawing_number: drawing.drawing_number,
          title: drawing.title,
          revision: drawing.current_revision,
          copies: 1,
        },
      ]);
    }
  };

  const handleCopiesChange = (drawingId: string, delta: number) => {
    onSelectionChange(
      selectedDrawings.map((d) => {
        if (d.drawing_id === drawingId) {
          const newCopies = Math.max(1, d.copies + delta);
          return { ...d, copies: newCopies };
        }
        return d;
      })
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search drawings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selected count */}
      {selectedDrawings.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedDrawings.length} drawing{selectedDrawings.length !== 1 ? 's' : ''}{' '}
            selected
          </Badge>
          <span className="text-sm text-muted-foreground">
            (Total copies:{' '}
            {selectedDrawings.reduce((sum, d) => sum + d.copies, 0)})
          </span>
        </div>
      )}

      {/* Drawing list */}
      <div className="rounded-md border max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Drawing No.</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[80px]">Rev</TableHead>
              <TableHead className="w-[120px]">Copies</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDrawings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No drawings found
                </TableCell>
              </TableRow>
            ) : (
              filteredDrawings.map((drawing) => {
                const selected = isSelected(drawing.id);
                const selectedItem = getSelectedItem(drawing.id);

                return (
                  <TableRow
                    key={drawing.id}
                    className={selected ? 'bg-primary/5' : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => handleToggle(drawing)}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {drawing.drawing_number}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {drawing.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{drawing.current_revision}</Badge>
                    </TableCell>
                    <TableCell>
                      {selected && selectedItem && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopiesChange(drawing.id, -1)}
                            disabled={selectedItem.copies <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">
                            {selectedItem.copies}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopiesChange(drawing.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
