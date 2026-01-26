# Design Document: Help Center Enhancement

## Overview

This enhancement adds a dedicated FAQs page (`/help/faqs`) and populates the database with comprehensive Indonesian FAQ content. The design leverages existing Help Center components and utilities from v0.38.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FAQs Page (/help/faqs)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Breadcrumb: Help Center > FAQs                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Search FAQs Input                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🚀 Getting Started                                  │   │
│  │  ├── [Accordion] Bagaimana cara login?              │   │
│  │  └── [Accordion] Bagaimana navigasi sistem?         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 Quotations                                       │   │
│  │  └── [Accordion] Bagaimana membuat quotation?       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📦 Job Orders                                       │   │
│  │  ├── [Accordion] Bagaimana membuat PJO?             │   │
│  │  └── [Accordion] Bagaimana mengisi biaya aktual?    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ... (more categories)                                      │
└─────────────────────────────────────────────────────────────┘
```

## Components

### FAQs Page (app/help/faqs/page.tsx)

```typescript
/**
 * FAQs Page - Server Component
 * Displays all FAQs grouped by category with search
 */
export default async function FAQsPage(): Promise<JSX.Element>
```

### FAQ Search Client Component (components/help-center/faq-search.tsx)

```typescript
interface FAQSearchProps {
  faqs: HelpFAQ[]
}

/**
 * FAQ Search - Client Component
 * Handles search filtering and displays FAQs with FAQAccordion
 */
export function FAQSearch({ faqs }: FAQSearchProps): JSX.Element
```

## Data Models

### FAQ Content Structure

Each FAQ entry follows the existing `HelpFAQ` interface:

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID (auto-generated) |
| question | string | FAQ question in Indonesian |
| answer | string | FAQ answer in Indonesian |
| category | HelpArticleCategory | Category for grouping |
| applicable_roles | string[] | Roles that can see this FAQ (empty = all) |
| display_order | number | Order within category |
| created_at | timestamp | Creation timestamp |

### FAQ Content by Category

#### Getting Started (getting_started)
1. Bagaimana cara login ke sistem?
2. Bagaimana cara navigasi di sistem?
3. Bagaimana cara mengubah password?
4. Apa saja fitur utama sistem ini?
5. Bagaimana cara melihat notifikasi?

#### Quotations (quotations)
1. Bagaimana cara membuat quotation baru?
2. Bagaimana cara mengedit quotation?
3. Apa itu engineering review pada quotation?
4. Bagaimana cara mengkonversi quotation ke PJO?

#### Job Orders (jobs)
1. Bagaimana cara membuat PJO baru?
2. Bagaimana cara mengisi biaya aktual di Job Order?
3. Apa perbedaan PJO dan Job Order?
4. Bagaimana alur approval PJO?
5. Bagaimana cara menyelesaikan Job Order?

#### Finance (finance)
1. Bagaimana cara membuat invoice?
2. Bagaimana cara mencatat pembayaran?
3. Apa itu BKK (Bukti Kas Keluar)?
4. Bagaimana cara melihat outstanding invoice?
5. Bagaimana cara split invoice?

#### HR (hr)
1. Bagaimana cara mengajukan cuti?
2. Bagaimana cara melihat slip gaji?
3. Bagaimana cara clock in/out?
4. Bagaimana cara melihat saldo cuti?

#### Reports (reports)
1. Bagaimana cara generate laporan?
2. Bagaimana cara export laporan ke PDF/Excel?
3. Laporan apa saja yang tersedia?

#### Troubleshooting (troubleshooting)
1. Sistem terasa lambat, apa yang harus dilakukan?
2. Bagaimana cara melaporkan bug?
3. Data tidak muncul, apa yang harus dilakukan?
4. Bagaimana cara clear cache browser?

## Correctness Properties

### Property 1: FAQ Search Filter Correctness

*For any* non-empty search query and any FAQ item returned by the filter, the item's question or answer SHALL contain the search query (case-insensitive match).

**Validates: Requirements 4.2**

### Property 2: Category Grouping Completeness

*For any* call to display FAQs grouped by category, every FAQ in the database SHALL appear exactly once in the grouped result.

**Validates: Requirements 1.2**

### Property 3: Role-Based Filtering

*For any* user role and FAQ with non-empty applicable_roles, the FAQ SHALL only be visible if the user's role is in applicable_roles.

**Validates: Requirements 1.4**

## Error Handling

| Scenario | Handling |
|----------|----------|
| No FAQs in database | Display "Belum ada FAQ tersedia" message |
| Search with no results | Display "Tidak ada FAQ yang ditemukan" message |
| Database error | Display error message with retry option |

## Testing Strategy

### Unit Tests
- Verify FAQs page renders without errors
- Verify search filtering works correctly
- Verify category grouping displays all FAQs
- Verify role-based filtering

### Property-Based Tests
- Property 1: Search filter correctness
- Property 2: Category grouping completeness
- Property 3: Role-based filtering

### Integration Tests
- Verify navigation from /help to /help/faqs
- Verify breadcrumb navigation
- Verify search input interaction

