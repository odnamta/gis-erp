---
inclusion: always
---
PROJECT: Gama ERP - Logistics Management System
COMPANY: PT. Gama Intisamudera (Heavy-haul logistics in Indonesia)

TECH STACK:
- Next.js 15 with App Router
- TypeScript (strict mode)
- TailwindCSS + shadcn/ui
- Supabase (PostgreSQL + Auth)

SUPABASE URL: https://ljbkjtaowrdddvjhsygj.supabase.co

DATABASE TABLES (already created):
- customers (id, name, email, phone, address)
- projects (id, customer_id, name, status)
- proforma_job_orders (PJO - quotations)
- job_orders (JO - actual work)
- invoices (billing)
- assets (equipment, vehicles, machinery)
- asset_categories (asset classification)
- asset_locations (asset tracking)
- maintenance_records (asset maintenance)
- peb_documents (customs export documentation)
- pib_documents (customs import documentation)
- customs_offices (customs office master data)

BUSINESS WORKFLOW:
Marketing → Admin creates PJO → Manager approves → Operations creates JO → Admin creates Invoice

ADDITIONAL MODULES:
- Assets Management: Track equipment, vehicles, maintenance schedules
- Customs Documentation: PEB (export) and PIB (import) document processing
- Engineering: Route surveys, JMP, technical assessments, drawings

USERS & ROLES:
- Dio Atmando (owner) - dioatmando@gama-group.co
- Hutami Arini (manager: marketing + engineering) - hutamiarini@gama-group.co
- Feri Supriono (manager: administration + finance) - ferisupriono@gama-group.co
- Reza Pramana (manager: operations + assets) - rezapramana@gama-group.co

ROLE STRUCTURE:
- owner: Full system access (Dio)
- director: Executive oversight
- manager: Department heads with department_scope (Hutami, Feri, Reza)
- sysadmin: IT administration, user management
- administration: PJO preparation, invoices, document management
- finance: Payments, AR/AP, payroll, BKK preparation
- marketing: Customers, quotations, cost estimation
- ops: Job execution, NO revenue visibility
- engineer: Surveys, JMP, drawings, technical assessments
- hr: Employee management, attendance, payroll
- hse: Health, Safety, Environment modules