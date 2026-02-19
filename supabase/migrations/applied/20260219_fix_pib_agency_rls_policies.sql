-- ============================================================================
-- Migration: Fix PIB & Agency RLS Policies
-- Date: 2026-02-19
-- Status: PENDING - Apply via Supabase SQL Editor
-- Purpose: Add missing RLS policies for PIB (Customs Import) and Agency tables
--          that were omitted from initial RLS setup, causing 403/empty queries
-- ============================================================================
-- Bugs Fixed:
--   BUG #41: Customs PIB page error (no RLS policies on pib_documents/pib_items)
--   BUG #47: Agency shipping line dropdown empty (no RLS SELECT policy)
-- ============================================================================

-- ============================================
-- PIB DOCUMENTS (Customs Import)
-- ============================================
ALTER TABLE pib_documents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view PIB documents
DROP POLICY IF EXISTS "pib_documents_select" ON pib_documents;
CREATE POLICY "pib_documents_select" ON pib_documents FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- Customs + management roles can create
DROP POLICY IF EXISTS "pib_documents_insert" ON pib_documents;
CREATE POLICY "pib_documents_insert" ON pib_documents FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'customs', 'operations_manager', 'administration', 'finance_manager'])
);

-- Customs + management roles can update
DROP POLICY IF EXISTS "pib_documents_update" ON pib_documents;
CREATE POLICY "pib_documents_update" ON pib_documents FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'customs', 'operations_manager', 'administration', 'finance_manager'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'customs', 'operations_manager', 'administration', 'finance_manager'])
);

-- Only admin can delete
DROP POLICY IF EXISTS "pib_documents_delete" ON pib_documents;
CREATE POLICY "pib_documents_delete" ON pib_documents FOR DELETE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin'])
);

-- ============================================
-- PIB ITEMS (Line items for customs import)
-- ============================================
ALTER TABLE pib_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pib_items_select" ON pib_items;
CREATE POLICY "pib_items_select" ON pib_items FOR SELECT USING (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "pib_items_insert" ON pib_items;
CREATE POLICY "pib_items_insert" ON pib_items FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'customs', 'operations_manager', 'administration', 'finance_manager'])
);

DROP POLICY IF EXISTS "pib_items_update" ON pib_items;
CREATE POLICY "pib_items_update" ON pib_items FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'customs', 'operations_manager', 'administration', 'finance_manager'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'customs', 'operations_manager', 'administration', 'finance_manager'])
);

DROP POLICY IF EXISTS "pib_items_delete" ON pib_items;
CREATE POLICY "pib_items_delete" ON pib_items FOR DELETE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'customs'])
);

-- ============================================
-- CUSTOMS OFFICES (Reference data)
-- ============================================
ALTER TABLE customs_offices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customs_offices_select" ON customs_offices;
CREATE POLICY "customs_offices_select" ON customs_offices FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- ============================================
-- IMPORT TYPES (Reference data)
-- ============================================
ALTER TABLE import_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_types_select" ON import_types;
CREATE POLICY "import_types_select" ON import_types FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- ============================================
-- SHIPPING LINES (Agency module)
-- ============================================
ALTER TABLE shipping_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_lines_select" ON shipping_lines;
CREATE POLICY "shipping_lines_select" ON shipping_lines FOR SELECT USING (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "shipping_lines_insert" ON shipping_lines;
CREATE POLICY "shipping_lines_insert" ON shipping_lines FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration'])
);

DROP POLICY IF EXISTS "shipping_lines_update" ON shipping_lines;
CREATE POLICY "shipping_lines_update" ON shipping_lines FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration'])
);

-- ============================================
-- VESSEL SCHEDULES (Agency module)
-- ============================================
ALTER TABLE vessel_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vessel_schedules_select" ON vessel_schedules;
CREATE POLICY "vessel_schedules_select" ON vessel_schedules FOR SELECT USING (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "vessel_schedules_insert" ON vessel_schedules;
CREATE POLICY "vessel_schedules_insert" ON vessel_schedules FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration'])
);

DROP POLICY IF EXISTS "vessel_schedules_update" ON vessel_schedules;
CREATE POLICY "vessel_schedules_update" ON vessel_schedules FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration'])
);

-- ============================================
-- BOOKINGS (Agency module)
-- ============================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select" ON bookings;
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "bookings_insert" ON bookings;
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration', 'marketing', 'marketing_manager'])
);

DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration', 'marketing', 'marketing_manager'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'agency', 'operations_manager', 'administration', 'marketing', 'marketing_manager'])
);
