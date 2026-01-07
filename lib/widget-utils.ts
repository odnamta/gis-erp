/**
 * Widget Utility Functions
 * v0.34: Dashboard Widgets & Customization
 */

import { createClient } from '@/lib/supabase/client';
import {
  VALID_WIDGET_TYPES,
  WIDGET_CONSTRAINTS,
  type WidgetType,
  type Widget,
  type WidgetConfig,
  type GridPosition,
} from '@/types/widgets';

// Database row types (matching Supabase schema)
interface DashboardWidgetRow {
  id: string;
  widget_code: string;
  widget_name: string;
  description: string | null;
  widget_type: string;
  data_source: string | null;
  default_width: number | null;
  default_height: number | null;
  allowed_roles: string[] | null;
  settings_schema: Record<string, unknown> | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string | null;
}

interface UserWidgetConfigRow {
  id: string;
  user_id: string;
  widget_id: string;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  settings: Record<string, unknown> | null;
  is_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DefaultWidgetLayoutRow {
  id: string;
  role: string;
  widget_id: string;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Check if a string is a valid widget type
 */
export function isValidWidgetType(type: string): type is WidgetType {
  return VALID_WIDGET_TYPES.includes(type as WidgetType);
}

/**
 * Validate widget dimensions are within constraints
 */
export function validateWidgetDimensions(width: number, height: number): boolean {
  return (
    width >= WIDGET_CONSTRAINTS.MIN_WIDTH &&
    width <= WIDGET_CONSTRAINTS.MAX_WIDTH &&
    height >= WIDGET_CONSTRAINTS.MIN_HEIGHT &&
    height <= WIDGET_CONSTRAINTS.MAX_HEIGHT
  );
}

/**
 * Clamp dimensions to valid range
 */
export function clampDimensions(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(WIDGET_CONSTRAINTS.MIN_WIDTH, Math.min(WIDGET_CONSTRAINTS.MAX_WIDTH, width)),
    height: Math.max(WIDGET_CONSTRAINTS.MIN_HEIGHT, Math.min(WIDGET_CONSTRAINTS.MAX_HEIGHT, height)),
  };
}

/**
 * Validate a widget configuration
 */
export function validateWidgetConfig(config: WidgetConfig): boolean {
  // Check dimensions
  if (!validateWidgetDimensions(config.width, config.height)) {
    return false;
  }

  // Check position is non-negative
  if (config.positionX < 0 || config.positionY < 0) {
    return false;
  }

  // Check widget type is valid
  if (!isValidWidgetType(config.widget.widget_type)) {
    return false;
  }

  return true;
}

// =====================================================
// FILTERING FUNCTIONS
// =====================================================

/**
 * Filter widgets by user role
 * Only returns widgets where the user's role is in allowed_roles
 * Widgets with empty allowed_roles are never included
 */
export function filterWidgetsByRole(widgets: Widget[], role: string): Widget[] {
  return widgets.filter(widget => {
    // Never include widgets with empty allowed_roles
    if (!widget.allowed_roles || widget.allowed_roles.length === 0) {
      return false;
    }
    // Include only if user's role is in allowed_roles
    return widget.allowed_roles.includes(role);
  });
}

/**
 * Filter widgets by active status
 */
export function filterActiveWidgets(widgets: Widget[]): Widget[] {
  return widgets.filter(widget => widget.is_active);
}

// =====================================================
// GRID CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate grid positions for widget configs
 */
export function calculateGridPositions(configs: WidgetConfig[], columns: number = 4): GridPosition[] {
  return configs.map(config => ({
    x: config.positionX % columns,
    y: config.positionY,
    w: Math.min(config.width, columns),
    h: config.height,
  }));
}

/**
 * Sort widget configs by position (y first, then x)
 */
export function sortWidgetsByPosition(configs: WidgetConfig[]): WidgetConfig[] {
  return [...configs].sort((a, b) => {
    if (a.positionY !== b.positionY) {
      return a.positionY - b.positionY;
    }
    return a.positionX - b.positionX;
  });
}

// =====================================================
// DATA TRANSFORMATION FUNCTIONS
// =====================================================

/**
 * Transform database widget row to Widget type
 */
export function transformWidgetRow(row: DashboardWidgetRow): Widget {
  return {
    id: row.id,
    widget_code: row.widget_code,
    widget_name: row.widget_name,
    description: row.description,
    widget_type: row.widget_type as WidgetType,
    data_source: row.data_source,
    default_width: row.default_width ?? 1,
    default_height: row.default_height ?? 1,
    allowed_roles: row.allowed_roles || [],
    settings_schema: (row.settings_schema as Record<string, unknown>) || {},
    is_active: row.is_active ?? true,
    display_order: row.display_order ?? 0,
    created_at: row.created_at ?? undefined,
  };
}

/**
 * Transform user config row to WidgetConfig
 */
export function transformUserConfigRow(
  row: UserWidgetConfigRow & { widget: DashboardWidgetRow }
): WidgetConfig {
  const widget = transformWidgetRow(row.widget);
  return {
    widgetId: row.widget_id,
    widget,
    positionX: row.position_x ?? 0,
    positionY: row.position_y ?? 0,
    width: row.width ?? widget.default_width,
    height: row.height ?? widget.default_height,
    settings: (row.settings as Record<string, unknown>) || {},
    isVisible: row.is_visible ?? true,
  };
}

/**
 * Transform default layout row to WidgetConfig
 */
export function transformDefaultLayoutRow(
  row: DefaultWidgetLayoutRow & { widget: DashboardWidgetRow }
): WidgetConfig {
  const widget = transformWidgetRow(row.widget);
  return {
    widgetId: row.widget_id,
    widget,
    positionX: row.position_x ?? 0,
    positionY: row.position_y ?? 0,
    width: row.width ?? widget.default_width,
    height: row.height ?? widget.default_height,
    settings: {},
    isVisible: true,
  };
}

// =====================================================
// DATABASE FUNCTIONS
// =====================================================

/**
 * Get all active widgets
 */
export async function getAllWidgets(): Promise<Widget[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching widgets:', error);
    throw error;
  }

  return (data || []).map(row => transformWidgetRow(row as unknown as DashboardWidgetRow));
}

/**
 * Get widgets for current user based on their role
 * First checks for user-specific config, falls back to default layout
 */
export async function getUserWidgets(userId: string, role: string): Promise<WidgetConfig[]> {
  const supabase = createClient();

  // First check for user-specific config
  const { data: userConfigs, error: userError } = await supabase
    .from('user_widget_configs')
    .select(`
      *,
      widget:dashboard_widgets(*)
    `)
    .eq('user_id', userId)
    .eq('is_visible', true);

  if (userError) {
    console.error('Error fetching user widget configs:', userError);
    throw userError;
  }

  // If user has custom configs, use them
  if (userConfigs && userConfigs.length > 0) {
    const configs = userConfigs
      .filter((c: { widget: unknown }) => c.widget && (c.widget as DashboardWidgetRow).is_active)
      .map((c: unknown) => transformUserConfigRow(c as UserWidgetConfigRow & { widget: DashboardWidgetRow }));
    
    // Filter by role and sort by position
    const filteredConfigs = configs.filter(c => 
      c.widget.allowed_roles.includes(role)
    );
    
    return sortWidgetsByPosition(filteredConfigs);
  }

  // Fall back to default layout for role
  const { data: defaultLayout, error: defaultError } = await supabase
    .from('default_widget_layouts')
    .select(`
      *,
      widget:dashboard_widgets(*)
    `)
    .eq('role', role)
    .order('position_y')
    .order('position_x');

  if (defaultError) {
    console.error('Error fetching default layout:', defaultError);
    throw defaultError;
  }

  if (!defaultLayout || defaultLayout.length === 0) {
    return [];
  }

  const configs = defaultLayout
    .filter((l: { widget: unknown }) => l.widget && (l.widget as DashboardWidgetRow).is_active)
    .map((l: unknown) => transformDefaultLayoutRow(l as DefaultWidgetLayoutRow & { widget: DashboardWidgetRow }));

  return sortWidgetsByPosition(configs);
}

/**
 * Save user widget configuration
 * Deletes existing configs and inserts new ones atomically
 */
export async function saveWidgetLayout(userId: string, widgets: WidgetConfig[]): Promise<void> {
  const supabase = createClient();

  // Delete existing configs
  const { error: deleteError } = await supabase
    .from('user_widget_configs')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting existing configs:', deleteError);
    throw deleteError;
  }

  // Insert new configs
  if (widgets.length > 0) {
    const configsToInsert = widgets.map(w => ({
      user_id: userId,
      widget_id: w.widgetId,
      position_x: w.positionX,
      position_y: w.positionY,
      width: w.width,
      height: w.height,
      settings: w.settings,
      is_visible: w.isVisible,
    }));

    const { error: insertError } = await supabase
      .from('user_widget_configs')
      .insert(configsToInsert as never[]);

    if (insertError) {
      console.error('Error inserting widget configs:', insertError);
      throw insertError;
    }
  }
}

/**
 * Reset user widget layout to defaults
 * Deletes all user configs for the user
 */
export async function resetWidgetLayout(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_widget_configs')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error resetting widget layout:', error);
    throw error;
  }
}

/**
 * Update a single widget config
 */
export async function updateWidgetConfig(
  userId: string,
  widgetId: string,
  updates: Partial<{
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    settings: Record<string, unknown>;
    is_visible: boolean;
  }>
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_widget_configs')
    .upsert({
      user_id: userId,
      widget_id: widgetId,
      ...updates,
      settings: updates.settings as unknown as never,
    } as never, {
      onConflict: 'user_id,widget_id',
    });

  if (error) {
    console.error('Error updating widget config:', error);
    throw error;
  }
}

/**
 * Toggle widget visibility
 */
export async function toggleWidgetVisibility(
  userId: string,
  widgetId: string,
  isVisible: boolean
): Promise<void> {
  return updateWidgetConfig(userId, widgetId, { is_visible: isVisible });
}

/**
 * Get available widgets for a role (widgets not yet in user's config)
 */
export async function getAvailableWidgets(userId: string, role: string): Promise<Widget[]> {
  const supabase = createClient();

  // Get all active widgets for the role
  const { data: allWidgets, error: widgetsError } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('is_active', true)
    .contains('allowed_roles', [role]);

  if (widgetsError) {
    console.error('Error fetching widgets:', widgetsError);
    throw widgetsError;
  }

  // Get user's current widget configs
  const { data: userConfigs, error: configsError } = await supabase
    .from('user_widget_configs')
    .select('widget_id')
    .eq('user_id', userId);

  if (configsError) {
    console.error('Error fetching user configs:', configsError);
    throw configsError;
  }

  const configuredWidgetIds = new Set((userConfigs || []).map((c: { widget_id: string }) => c.widget_id));

  // Return widgets not in user's config
  return (allWidgets || [])
    .filter((w: { id: string }) => !configuredWidgetIds.has(w.id))
    .map(row => transformWidgetRow(row as unknown as DashboardWidgetRow));
}
