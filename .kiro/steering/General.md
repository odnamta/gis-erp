---
inclusion: always
---
# GAMA ERP - Agent Steering Document

> **Purpose**: This document provides context for AI agents (Kiro, Claude, Cursor) assisting with Gama ERP development.

---

## 1. Project Overview

**Gama ERP** is a logistics management system for PT Gama Indonesia. It manages the workflow from client RFQ to invoice payment collection.

### Core Business Workflow
```
Marketing (Quotation) → Administration (PJO) → Operations → Administration (JO/Invoice)
```

| Stage | Activities |
|-------|-----------|
| **Marketing** | RFQ Received → Create Quotation → Engineering Review (if complex) → Submit to Client → Won/Lost |
| **Engineering** | Assess complex quotations, Create JMP (Journey Management Plan), Equipment Lists |
| **Administration (PJO)** | Convert Won Quotation to PJO → Set Cost Targets → Approval Workflow |
| **Operations** | Receive Budget → Adjust Plan → Coordinate Vendors → Execute → Submit Expenses |
| **Admin (JO)** | Collect Expenses → Create JO → Generate Invoice → Track Payment |

---

## 2. Technology Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Frontend | Next.js (App Router) | v14.2.x |
| UI | React | v18.x |
| Language | TypeScript | Strict mode |
| Styling | TailwindCSS + shadcn/ui (new-york) | Components in /components/ui |
| Backend | Supabase | PostgreSQL + Auth + Storage |
| Auth | Supabase Auth | @supabase/ssr for SSR support |
| Icons | Lucide React | |
| Date Utils | date-fns, react-day-picker | |

### Key Libraries
- `class-variance-authority` + `clsx` + `tailwind-merge` for className utilities
- `cmdk` for command palette/combobox

### Supabase Configuration
- **MCP Integration**: Available via Kiro
- **RLS**: Enabled on all tables

### Commands
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

### Adding Shadcn Components
```bash
npx shadcn@latest add <component-name>
```

---

## 3. Database Schema

### Current Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `customers` | Client companies | id, name, email, phone, address |
| `projects` | Projects/opportunities | id, customer_id, name, status |
| `quotations` | Pre-award quotations with classification | id, quotation_number, status, market_type, complexity_score |
| `quotation_revenue_items` | Itemized revenue per quotation | id, quotation_id, category, unit_price, subtotal |
| `quotation_cost_items` | Estimated costs per quotation | id, quotation_id, category, estimated_amount |
| `pursuit_costs` | Pre-award costs (travel, survey, etc.) | id, quotation_id, category, amount |
| `proforma_job_orders` | PJOs with approval workflow | id, pjo_number, status, quotation_id |
| `pjo_revenue_items` | Itemized revenue per PJO | id, pjo_id, description, quantity, unit, unit_price, subtotal |
| `pjo_cost_items` | Itemized costs with budget tracking | id, pjo_id, category, estimated_amount, actual_amount, status |
| `job_orders` | Active JOs linked to PJOs | id, jo_number, pjo_id, final_revenue, final_cost, status |
| `invoices` | Invoices with payment tracking | id, invoice_number, jo_id, status |
| `route_surveys` | Route survey records | id, survey_number, project_id, status |
| `journey_management_plans` | JMP records | id, jmp_number, project_id, status |
| `technical_assessments` | Engineering assessments | id, assessment_number, project_id, status |
| `drawing_categories` | Drawing type classification | id, category_code, category_name, numbering_prefix |
| `drawings` | Engineering drawings register | id, drawing_number, category_id, status, current_revision |
| `drawing_revisions` | Drawing version history | id, drawing_id, revision_number, change_description |
| `drawing_transmittals` | Drawing distribution tracking | id, transmittal_number, recipient_company, status |

### Assets Management Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `assets` | Equipment, vehicles, machinery | id, asset_number, category_id, status, current_location_id |
| `asset_categories` | Asset classification | id, category_code, category_name, parent_category_id |
| `asset_locations` | Asset tracking locations | id, location_code, location_name, address, city |
| `asset_assignments` | Asset job assignments | id, asset_id, job_order_id, employee_id, assigned_by |
| `maintenance_records` | Asset maintenance history | id, asset_id, maintenance_type_id, scheduled_date, completed_date |
| `maintenance_schedules` | Preventive maintenance | id, asset_id, maintenance_type_id, frequency_days, next_due_date |

### Customs Documentation Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `peb_documents` | Export customs documents | id, peb_number, job_order_id, exporter_name, customs_office_id, status |
| `peb_items` | Export document line items | id, peb_id, hs_code, goods_description, quantity, unit_price |
| `pib_documents` | Import customs documents | id, pib_number, job_order_id, importer_name, customs_office_id, status |
| `pib_items` | Import document line items | id, pib_id, hs_code, goods_description, quantity, unit_price |
| `customs_offices` | Customs office master data | id, office_code, office_name, city, province |

### Key Relationships
```
customers → projects (1:many)
projects → quotations (1:many)
quotations → quotation_revenue_items (1:many)
quotations → quotation_cost_items (1:many)
quotations → pursuit_costs (1:many)
quotations → proforma_job_orders (1:many, via conversion)
projects → proforma_job_orders (1:many)
proforma_job_orders → pjo_revenue_items (1:many)
proforma_job_orders → pjo_cost_items (1:many)
proforma_job_orders → job_orders (1:1)
job_orders → invoices (1:many)

# Engineering Module
projects → route_surveys (1:many)
projects → journey_management_plans (1:many)
projects → technical_assessments (1:many)
projects → drawings (1:many)
drawing_categories → drawings (1:many)
drawings → drawing_revisions (1:many)
projects → drawing_transmittals (1:many)

# Assets Module
asset_categories → assets (1:many)
asset_locations → assets (1:many)
assets → asset_assignments (1:many)
job_orders → asset_assignments (1:many)
employees → asset_assignments (1:many)
assets → maintenance_records (1:many)
assets → maintenance_schedules (1:many)

# Customs Module
job_orders → peb_documents (1:many)
job_orders → pib_documents (1:many)
customs_offices → peb_documents (1:many)
customs_offices → pib_documents (1:many)
peb_documents → peb_items (1:many)
pib_documents → pib_items (1:many)
```

### Cost Categories
`trucking`, `port_charges`, `documentation`, `handling`, `customs`, `insurance`, `storage`, `labor`, `fuel`, `tolls`, `other`

---

## 4. User Roles & Permissions

| Role | Department | Can Do | Dashboard Shows |
|------|-----------|--------|-----------------|
| `owner` | All | Full system access, final approver | Executive Dashboard |
| `director` | All | Executive oversight, approve PJO/JO/BKK | Executive Dashboard |
| `manager` | Multi-dept | Department head with more than one scope (marketing+engineering, admin+finance, ops+assets) | Manager Dashboard |
| `sysadmin` | IT | User management, system administration | System Admin Dashboard |
| `administration` | Admin | PJO preparation, invoices, document management | Admin Dashboard |
| `finance` | Finance | Payments, AR/AP, payroll, BKK preparation | Finance Dashboard |
| `marketing` | Marketing | Customers, quotations, cost estimation | Marketing Dashboard |
| `ops` | Operations | Job execution, NO revenue visibility | Operations Dashboard |
| `engineer` | Engineering | Surveys, JMP, drawings, technical assessments | Engineering Dashboard |
| `hr` | HR | Employee management, attendance, payroll | HR Dashboard |
| `hse` | HSE | Health, Safety, Environment modules | HSE Dashboard |

**Manager Department Scopes:**
- Hutami Arini: marketing + engineering
- Feri Supriono: administration + finance  
- Reza Pramana: operations + assets

**Note**: `ops` role does NOT have access to Quotations module (they only see JOs after award).

---

## 5. Additional Modules

### Assets Management Module
**Purpose**: Track and manage company equipment, vehicles, and machinery

**Key Features**:
- Asset registration with categories and locations
- Maintenance scheduling and tracking
- Asset assignments to jobs and employees
- Depreciation calculations
- Utilization reporting
- Asset dashboard with performance metrics

**Workflows**:
```
Asset Registration → Category Assignment → Location Tracking → Job Assignment → Maintenance Scheduling
```

**Access Control**:
- View: owner, director, manager, ops
- Create/Edit: owner, director, manager
- Assign: manager, ops
- Maintenance: ops, maintenance staff

### Customs Documentation Module
**Purpose**: Handle import/export customs documentation (PEB/PIB)

**Key Features**:
- PEB (Export) document creation and management
- PIB (Import) document creation and management
- HS code management and validation
- Customs office integration
- Document status tracking
- Automated calculations (duties, taxes)

**Workflows**:
```
# Export Flow (PEB)
Job Order → Create PEB → Add Items → Submit to Customs → Track Status → Archive

# Import Flow (PIB)
Job Order → Create PIB → Add Items → Calculate Duties → Submit to Customs → Track Status → Archive
```

**Access Control**:
- View: owner, director, manager, administration
- Create/Edit: owner, director, manager, administration
- Submit: administration, customs staff
- Delete: owner, director only

### Engineering Module (Enhanced)
**Purpose**: Technical assessments, route surveys, and drawing management

**Key Features**:
- Route surveys with GPS waypoints
- Journey Management Plans (JMP)
- Technical assessments and calculations
- Drawing management with revisions
- Drawing transmittals and approvals
- Engineering resource scheduling

**Workflows**:
```
Project Award → Route Survey → Technical Assessment → JMP Creation → Drawing Production → Approval → Transmittal
```

---

## 6. Code Conventions

### File Structure
```
/app          → Next.js App Router pages and layouts
/components   → Reusable React components
/components/ui → shadcn/ui components
/lib          → Utility functions and Supabase client
/types        → TypeScript type definitions
```

### Naming Conventions
- **Components**: PascalCase (`CustomerForm.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Types**: PascalCase (`Customer`, `JobOrder`)
- **DB columns**: snake_case (`created_at`, `customer_id`)

### Supabase Patterns
```typescript
// Client-side query
const { data, error } = await supabase.from('customers').select('*')

// Server Action (use 'use server' directive)
// Place in /app/actions folder
```

---

## 7. Current Tasks

### Phase 1 - Foundation ✅

| Task | Description | Status | Priority |
|------|-------------|--------|----------|
| 1.1 | Database Schema Setup | ✅ COMPLETE | P0 |
| 1.2 | Google OAuth Integration | ✅ COMPLETE | P0 |
| 1.3 | Customer CRUD Operations | ✅ COMPLETE | P1 |
| 1.4 | Role-Based Dashboard Views | ⬜ TODO | P1 |

### Phase 2 - PJO Itemized Financials (v0.4.1) ✅

| Task | Description | Status | Priority |
|------|-------------|--------|----------|
| 2.1 | Revenue/Cost line items tables | ✅ COMPLETE | P0 |
| 2.2 | Revenue items CRUD | ✅ COMPLETE | P0 |
| 2.3 | Cost items estimation | ✅ COMPLETE | P0 |
| 2.4 | Cost confirmation (Operations) | ✅ COMPLETE | P0 |
| 2.5 | Budget summary & health indicators | ✅ COMPLETE | P0 |
| 2.6 | PJO → JO conversion | ✅ COMPLETE | P1 |
| 2.7 | Job Orders module | ✅ COMPLETE | P1 |

---

## 8. Critical Constraints

### ⚠️ Security (MUST FOLLOW)
1. All tables MUST have RLS policies
2. Users can only access data from their assigned company
3. API keys never exposed in client-side code
4. All auth flows through Supabase Auth

### Data Integrity
1. PJO/JO/Invoice numbers auto-generated and unique
2. Status transitions follow defined workflows
3. Soft-delete with `is_active = false`
4. Monetary values as `DECIMAL(15,2)`

### UI/UX Standards
1. Use shadcn/ui components consistently
2. Loading states for all async operations
3. User-friendly error messages
4. Mobile-responsive design
5. Date format: DD/MM/YYYY (use `formatDate()` from `lib/pjo-utils.ts`)

---

## 9. Common Patterns

### Auto-generated Numbers
```
QUO: QUO-YYYY-NNNN (e.g., QUO-2025-0001)
PJO: NNNN/CARGO/MM/YYYY (e.g., 0001/CARGO/XII/2025)
JO:  JO-NNNN/CARGO/MM/YYYY (e.g., JO-0001/CARGO/XII/2025)
INV: INV-2025-0001
DRW: {PREFIX}-YYYY-NNNN (e.g., GA-2025-0001, LP-2025-0002)
TR:  TR-YYYY-NNNN (e.g., TR-2025-0001)
PEB: PEB-YYYY-NNNN (e.g., PEB-2025-0001)
PIB: PIB-YYYY-NNNN (e.g., PIB-2025-0001)
AST: AST-YYYY-NNNN (e.g., AST-2025-0001)
MNT: MNT-YYYY-NNNN (e.g., MNT-2025-0001)
```

### Status Workflows
```
Quotation: draft → engineering_review → ready → submitted → won/lost/cancelled
           (complexity_score >= 20 triggers engineering_review)
PJO:       draft → pending_approval → approved → rejected
           (approved PJO can be converted to JO when all costs confirmed)
JO:        active → completed → submitted_to_finance → invoiced → closed
Invoice:   draft → sent → paid → overdue → cancelled
Project:   active → completed → on_hold
Drawing:   draft → for_review → for_approval → approved → issued → superseded
Transmittal: draft → sent → acknowledged

# Assets Module
Asset:     active → maintenance → idle → disposed
Maintenance: scheduled → in_progress → completed → cancelled

# Customs Module  
PEB:       draft → submitted → processing → cleared → archived
PIB:       draft → submitted → processing → duties_calculated → cleared → archived
```

### Market Classification
- **Simple** (complexity_score < 20): Standard cargo, no special requirements
- **Complex** (complexity_score >= 20): Requires engineering assessment before submission
- Factors: cargo weight/dimensions, route terrain, special permits, hazardous materials

### Cost Item Status
```
estimated → confirmed (actual ≤ estimated)
          → exceeded (actual > estimated, requires justification)
          → under_budget (actual < estimated)
```

---

## 10. When Generating Code

### ✅ Do
- Check existing components before creating new ones
- Use existing Supabase client from `/lib/supabase`
- Follow TypeScript strict mode (no `any` types)
- Use Server Actions for mutations
- Add RLS policies immediately after creating tables

### ❌ Don't
- Create duplicate components
- Expose environment variables in client code
- Skip loading/error states
- Use inline styles (use Tailwind)

---

## 11. Quick Reference

### Supabase MCP Commands (for Kiro)
```sql
-- List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- View table structure
\d+ table_name
```
---

*Last Updated: December 2025*