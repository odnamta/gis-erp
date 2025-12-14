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

BUSINESS WORKFLOW:
Marketing → Admin creates PJO → Manager approves → Operations creates JO → Admin creates Invoice

USERS:
- Dio Atmando (admin/owner) - dioatmando@gama-group.co
- Feri Supriono (finance manager) - ferisupriono@gama-group.co
- Hutami Arini (marketing manager) - hutamiarini@gama-group.co
- Reza Pramana (operations manager) - rezapramana@gama-group.co