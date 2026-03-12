'use client';

/**
 * WidgetGrid Component
 * v0.34: Dashboard Widgets & Customization
 * 
 * 4-column responsive grid layout for widgets.
 * Supports widget spanning (1-4 columns, 1-3 rows).
 * Collapses to 2 columns on tablet, 1 on mobile.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { WidgetRenderer } from './WidgetRenderer';
import { sortWidgetsByPosition } from '@/lib/widget-utils';
import type { WidgetGridProps, WidgetConfig } from '@/types/widgets';

// Grid column span classes
const colSpanClasses: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-2 lg:col-span-3',
  4: 'col-span-1 md:col-span-2 lg:col-span-4',
};

// Grid row span classes
const rowSpanClasses: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
};

// Height classes based on row span
const heightClasses: Record<number, string> = {
  1: 'min-h-[140px]',
  2: 'min-h-[300px]',
  3: 'min-h-[460px]',
};

interface WidgetSlotProps {
  config: WidgetConfig;
  isEditing?: boolean;
}

function WidgetSlot({ config, isEditing }: WidgetSlotProps) {
  const colSpan = colSpanClasses[config.width] || colSpanClasses[1];
  const rowSpan = rowSpanClasses[config.height] || rowSpanClasses[1];
  const height = heightClasses[config.height] || heightClasses[1];

  return (
    <div
      className={cn(
        colSpan,
        rowSpan,
        height,
        'transition-all duration-200',
        isEditing && 'ring-2 ring-dashed ring-muted-foreground/30 rounded-lg'
      )}
    >
      <WidgetRenderer config={config} />
    </div>
  );
}

export function WidgetGrid({ configs, onLayoutChange: _onLayoutChange, isEditing = false }: WidgetGridProps) {
  // Sort widgets by position
  const sortedConfigs = useMemo(() => {
    return sortWidgetsByPosition(configs);
  }, [configs]);

  // Filter visible widgets
  const visibleConfigs = useMemo(() => {
    return sortedConfigs.filter(c => c.isVisible);
  }, [sortedConfigs]);

  if (visibleConfigs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No widgets to display. Add widgets to customize your dashboard.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        // Responsive grid: 1 col mobile, 2 cols tablet, 4 cols desktop
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        // Auto rows for dynamic height
        'auto-rows-auto'
      )}
    >
      {visibleConfigs.map(config => (
        <WidgetSlot
          key={config.widgetId}
          config={config}
          isEditing={isEditing}
        />
      ))}
    </div>
  );
}

export default WidgetGrid;
