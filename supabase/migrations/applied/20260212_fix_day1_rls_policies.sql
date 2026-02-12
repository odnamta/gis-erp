-- ============================================================================
-- Migration: Fix Day 1 Co-Builder RLS Policies
-- Date: 2026-02-12
-- Status: APPLIED via Supabase Management API
-- Purpose: Fix INSERT/UPDATE policies that used legacy role names
--          (admin, super_admin, manager) instead of actual roles
--          (director, sysadmin, marketing_manager, operations_manager, etc.)
-- ============================================================================
-- Bugs Fixed:
--   BUG 1: Cannot add new customer (operations_manager blocked by RLS)
--   BUG 2: Cannot add project (operations_manager blocked by RLS)
--   BUG 3: Cannot add assets in equipment (operations_manager blocked by RLS)
--   BUG 4: Error reporting HSE incident (RLS blocking + employee profile)
--   BUG 5: Cannot add files in project (document_attachments RLS)
--   BONUS: Feedback admin dashboard used wrong role names in code
-- ============================================================================

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'marketing_manager', 'marketing', 'operations_manager', 'administration', 'finance_manager'])
);

DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'marketing_manager', 'marketing', 'operations_manager', 'administration', 'finance_manager'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'marketing_manager', 'marketing', 'operations_manager', 'administration', 'finance_manager'])
);

DROP POLICY IF EXISTS "customers_delete" ON customers;
CREATE POLICY "customers_delete" ON customers FOR DELETE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin'])
);

-- PROJECTS
DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'marketing_manager', 'marketing', 'operations_manager', 'administration', 'engineer', 'finance_manager', 'ops'])
);

DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'marketing_manager', 'marketing', 'operations_manager', 'administration', 'engineer', 'finance_manager', 'ops'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'marketing_manager', 'marketing', 'operations_manager', 'administration', 'engineer', 'finance_manager', 'ops'])
);

DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin'])
);

-- ASSETS
DROP POLICY IF EXISTS "assets_insert" ON assets;
CREATE POLICY "assets_insert" ON assets FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'ops', 'finance_manager', 'engineer', 'administration'])
);

DROP POLICY IF EXISTS "assets_update" ON assets;
CREATE POLICY "assets_update" ON assets FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'ops', 'finance_manager', 'engineer', 'administration'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'ops', 'finance_manager', 'engineer', 'administration'])
);

DROP POLICY IF EXISTS "assets_delete" ON assets;
CREATE POLICY "assets_delete" ON assets FOR DELETE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin'])
);

-- ASSET STATUS HISTORY
DROP POLICY IF EXISTS "asset_status_history_insert" ON asset_status_history;
CREATE POLICY "asset_status_history_insert" ON asset_status_history FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'ops', 'finance_manager', 'engineer', 'administration'])
);

-- ASSET DOCUMENTS
DROP POLICY IF EXISTS "asset_documents_insert" ON asset_documents;
CREATE POLICY "asset_documents_insert" ON asset_documents FOR INSERT WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'ops', 'finance_manager', 'engineer', 'administration'])
);

-- INCIDENTS (all authenticated can report)
DROP POLICY IF EXISTS "incidents_insert" ON incidents;
CREATE POLICY "incidents_insert" ON incidents FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "incidents_update" ON incidents;
CREATE POLICY "incidents_update" ON incidents FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'hse', 'marketing_manager', 'finance_manager'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'hse', 'marketing_manager', 'finance_manager'])
);

-- INCIDENT PERSONS
DROP POLICY IF EXISTS "incident_persons_insert" ON incident_persons;
CREATE POLICY "incident_persons_insert" ON incident_persons FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "incident_persons_update" ON incident_persons;
CREATE POLICY "incident_persons_update" ON incident_persons FOR UPDATE USING (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'hse'])
) WITH CHECK (
  has_role(ARRAY['owner', 'director', 'sysadmin', 'operations_manager', 'hse'])
);

-- EMPLOYEES (allow insert for auto-creation in incident reporting)
DROP POLICY IF EXISTS "employees_all" ON employees;
DROP POLICY IF EXISTS "employees_insert_hr" ON employees;
CREATE POLICY "employees_insert_hr" ON employees FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('hr', 'owner', 'director', 'sysadmin', 'finance_manager', 'operations_manager', 'marketing_manager')
    AND user_profiles.is_active = true
  )
  OR auth.uid() IS NOT NULL
);

-- DOCUMENT ATTACHMENTS (all authenticated)
DROP POLICY IF EXISTS "document_attachments_insert" ON document_attachments;
CREATE POLICY "document_attachments_insert" ON document_attachments FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "document_attachments_update" ON document_attachments;
CREATE POLICY "document_attachments_update" ON document_attachments FOR UPDATE USING (
  auth.uid() IS NOT NULL
) WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "document_attachments_delete" ON document_attachments;
CREATE POLICY "document_attachments_delete" ON document_attachments FOR DELETE USING (
  auth.uid() IS NOT NULL
);

-- CHANGELOG ENTRY
INSERT INTO changelog_entries (version, title, description, category, is_major, published_at)
VALUES (
  '0.11.0',
  'Perbaikan Bug Hari Pertama Co-Builder',
  'Terima kasih kepada Reza Pramana dan Luthfi Badar Nawa yang telah melaporkan bug pada hari pertama Co-Builder!

Perbaikan yang dilakukan:
- Fix: Tidak bisa menambah Customer baru (dilaporkan oleh Reza)
- Fix: Tidak bisa menambah Project baru (dilaporkan oleh Reza)
- Fix: Tidak bisa menambah asset di Equipment (dilaporkan oleh Nawa)
- Fix: Error saat melaporkan insiden HSE (dilaporkan oleh Reza)
- Fix: Tidak bisa upload file/foto di Project (dilaporkan oleh Reza)
- Fix: Feedback admin dashboard tidak bisa diakses oleh Owner
- Fix: Semua role operations_manager & administration sekarang bisa membuat Customer dan Project
- Fitur baru: Tombol "Copy New" & "Copy All" di Feedback Admin untuk export ke clipboard

Akar masalah: RLS (Row Level Security) policy di database menggunakan nama role lama. Sudah diperbaiki untuk semua tabel terkait.',
  'bugfix',
  true,
  '2026-02-12T23:00:00+07:00'
) ON CONFLICT DO NOTHING;
