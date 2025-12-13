# Gama ERP - Logistics Management System

A Next.js 14 logistics management system built with TypeScript, Tailwind CSS, Shadcn/ui, and Supabase.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Storage)

## Project Structure

```
/app
  /(main)
    /dashboard    - Main dashboard
    /pjo          - Proforma Job Orders
    /jo           - Job Orders (actual)
    /invoices     - Customer invoices
    /customers    - Customer management
    /projects     - Project management
    /settings     - System settings

/components
  /ui             - Shadcn components
  /forms          - Form components (Combobox, DatePicker)
  /tables         - Data tables
  /layout         - Layout components (Sidebar, Header)

/lib
  /supabase       - Supabase client (browser, server, middleware)
  /utils          - Helper functions

/types            - TypeScript types
```

## Getting Started

1. Copy `.env.local.example` to `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Shadcn/ui Components Installed

- Button, Input, Label, Card
- Table, Dialog, Sheet
- Select, Command (Combobox), Calendar (DatePicker)
- Toast, Alert, Popover
