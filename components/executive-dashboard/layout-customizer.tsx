'use client';

// =====================================================
// v0.61: Dashboard Layout Customizer Component
// Requirements: 10.1, 10.2, 10.5
// =====================================================

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DashboardWidget, DashboardLayout, WidgetType } from '@/types/executive-dashboard';
import {
  GripVertical,
  X,
  RotateCcw,
  Save,
  BarChart3,
  PieChart,
  Table,
  Gauge,
  List,
  LayoutGrid,
} from 'lucide-react';

interface LayoutCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: DashboardLayout;
  onSave: (widgets: DashboardWidget[]) => Promise<void>;
  onReset: () => Promise<void>;
}

// Widget type icons
const widgetTypeIcons: Record<WidgetType, React.ReactNode> = {
  kpi_card: <LayoutGrid className="h-4 w-4" />,
  chart: <BarChart3 className="h-4 w-4" />,
  table: <Table className="h-4 w-4" />,
  funnel: <PieChart className="h-4 w-4" />,
  gauge: <Gauge className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
};

// Widget type labels
const widgetTypeLabels: Record<WidgetType, string> = {
  kpi_card: 'KPI Card',
  chart: 'Chart',
  table: 'Table',
  funnel: 'Funnel',
  gauge: 'Gauge',
  list: 'List',
};

export function LayoutCustomizer({
  open,
  onOpenChange,
  layout,
  onSave,
  onReset,
}: LayoutCustomizerProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(layout.widgets);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const dragOverIndex = useRef<number | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  }, []);

  // Handle drop - reorder widgets
  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setWidgets((prev) => {
      const newWidgets = [...prev];
      const [draggedWidget] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(dropIndex, 0, draggedWidget);
      
      // Update positions based on new order
      return newWidgets.map((widget, idx) => ({
        ...widget,
        position: {
          ...widget.position,
          y: idx * 2, // Simple vertical stacking
        },
      }));
    });

    setDraggedIndex(null);
  }, [draggedIndex]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    dragOverIndex.current = null;
  }, []);

  // Remove widget
  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.widgetId !== widgetId));
  }, []);

  // Save layout
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(widgets);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving layout:', error);
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error resetting layout:', error);
    } finally {
      setResetting(false);
    }
  };

  // Get widget display name
  const getWidgetDisplayName = (widget: DashboardWidget): string => {
    if (widget.kpiCodes && widget.kpiCodes.length > 0) {
      return widget.kpiCodes.join(', ');
    }
    return widget.widgetId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Customize Dashboard Layout
          </DialogTitle>
          <DialogDescription>
            Drag and drop widgets to reorder them. Remove widgets you don&apos;t need.
          </DialogDescription>
        </DialogHeader>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {widgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No widgets configured</p>
              <p className="text-sm">Reset to default to restore widgets</p>
            </div>
          ) : (
            widgets.map((widget, index) => (
              <Card
                key={widget.widgetId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'cursor-move transition-all',
                  draggedIndex === index && 'opacity-50 scale-95',
                  draggedIndex !== null && draggedIndex !== index && 'border-dashed'
                )}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Drag Handle */}
                  <div className="text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Widget Type Icon */}
                  <div className="p-2 rounded-md bg-muted">
                    {widgetTypeIcons[widget.type]}
                  </div>

                  {/* Widget Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {getWidgetDisplayName(widget)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {widgetTypeLabels[widget.type]}
                    </div>
                  </div>

                  {/* Position Badge */}
                  <Badge variant="outline" className="text-xs">
                    {widget.position.w}x{widget.position.h}
                  </Badge>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveWidget(widget.widgetId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetting || saving}
          >
            <RotateCcw className={cn('h-4 w-4 mr-2', resetting && 'animate-spin')} />
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || resetting}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Layout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LayoutCustomizer;
