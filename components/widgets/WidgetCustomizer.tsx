'use client';

/**
 * WidgetCustomizer Component
 * v0.34: Dashboard Widgets & Customization
 * 
 * UI for customizing widget layout:
 * - Toggle widget visibility
 * - Add available widgets
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { getAvailableWidgets } from '@/lib/widget-utils';
import { cn } from '@/lib/utils';
import type { WidgetConfig, Widget } from '@/types/widgets';

interface WidgetCustomizerProps {
  configs: WidgetConfig[];
  userRole: string;
  userId: string;
  onConfigsChange: (configs: WidgetConfig[]) => void;
}

const widgetTypeIcons: Record<string, string> = {
  stat_card: '📊',
  chart: '📈',
  list: '📋',
  table: '📑',
  progress: '📉',
  calendar: '📅',
};

export function WidgetCustomizer({ 
  configs, 
  userRole, 
  userId,
  onConfigsChange 
}: WidgetCustomizerProps) {
  const [availableWidgets, setAvailableWidgets] = useState<Widget[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);

  // Load available widgets
  useEffect(() => {
    const loadAvailable = async () => {
      setIsLoadingAvailable(true);
      try {
        const widgets = await getAvailableWidgets(userId, userRole);
        setAvailableWidgets(widgets);
      } catch (error) {
        console.error('Failed to load available widgets:', error);
      } finally {
        setIsLoadingAvailable(false);
      }
    };
    loadAvailable();
  }, [userId, userRole, configs]);

  // Toggle widget visibility
  const toggleVisibility = (widgetId: string) => {
    const newConfigs = configs.map(c => 
      c.widgetId === widgetId 
        ? { ...c, isVisible: !c.isVisible }
        : c
    );
    onConfigsChange(newConfigs);
  };

  // Add widget to dashboard
  const addWidget = (widget: Widget) => {
    // Find the next available position
    const maxY = Math.max(...configs.map(c => c.positionY), -1);
    
    const newConfig: WidgetConfig = {
      widgetId: widget.id,
      widget,
      positionX: 0,
      positionY: maxY + 1,
      width: widget.default_width,
      height: widget.default_height,
      settings: {},
      isVisible: true,
    };

    onConfigsChange([...configs, newConfig]);
  };

  // Remove widget from dashboard
  const _removeWidget = (widgetId: string) => {
    const newConfigs = configs.filter(c => c.widgetId !== widgetId);
    onConfigsChange(newConfigs);
  };

  const visibleCount = configs.filter(c => c.isVisible).length;
  const hiddenCount = configs.filter(c => !c.isVisible).length;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Customize Dashboard
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              {visibleCount} visible
            </Badge>
            {hiddenCount > 0 && (
              <Badge variant="outline" className="gap-1">
                <EyeOff className="h-3 w-3" />
                {hiddenCount} hidden
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current widgets */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Current Widgets</h4>
          <ScrollArea className="h-[120px]">
            <div className="space-y-2">
              {configs.map(config => (
                <div
                  key={config.widgetId}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-md border',
                    config.isVisible ? 'bg-background' : 'bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {widgetTypeIcons[config.widget.widget_type] || '📦'}
                    </span>
                    <span className={cn(
                      'text-sm',
                      !config.isVisible && 'text-muted-foreground'
                    )}>
                      {config.widget.widget_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {config.width}x{config.height}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.isVisible}
                      onCheckedChange={() => toggleVisibility(config.widgetId)}
                      aria-label={`Toggle ${config.widget.widget_name} visibility`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        {/* Available widgets to add */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Add Widgets
            {isLoadingAvailable && <span className="ml-2">Loading...</span>}
          </h4>
          {availableWidgets.length === 0 && !isLoadingAvailable ? (
            <p className="text-xs text-muted-foreground py-2">
              All available widgets are already on your dashboard.
            </p>
          ) : (
            <ScrollArea className="h-[100px]">
              <div className="flex flex-wrap gap-2">
                {availableWidgets.map(widget => (
                  <Button
                    key={widget.id}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1.5 px-2"
                    onClick={() => addWidget(widget)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="mr-1">
                      {widgetTypeIcons[widget.widget_type] || '📦'}
                    </span>
                    {widget.widget_name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WidgetCustomizer;
