# GIS-ERP Scalability Design

> Created: February 26, 2026 | Target: Q2-Q3 2026 implementation

## Current Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Vercel CDN    │────▶│  Next.js 15 App   │────▶│   Supabase      │
│  (Edge Cache)   │     │  (Server Actions)  │     │  (PostgreSQL)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌──────────────┐          ┌──────────────┐
                        │ @react-pdf   │          │  Supabase    │
                        │  (on-demand) │          │  Storage     │
                        └──────────────┘          └──────────────┘
```

**Pain points at current architecture:**
- Every PDF view/download triggers full React render + DB query
- 484 queries fetch all columns (`SELECT *`)
- No query result caching between requests
- List views unbounded (most now have `.limit()` but no pagination UI)

## Target Architecture

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐    ┌──────────────┐
│  Vercel CDN  │───▶│  Next.js App  │───▶│  Vercel KV   │───▶│  Supabase    │
│  (static +   │    │  (App Router) │    │  (Redis)     │    │  (PostgreSQL)│
│   PDF cache) │    └───────────────┘    └──────────────┘    └──────────────┘
└──────────────┘           │                                        │
                           ▼                                        ▼
                    ┌──────────────┐                          ┌──────────────┐
                    │ PDF Worker   │                          │  Supabase    │
                    │ (Edge Func)  │─────────────────────────▶│  Storage     │
                    └──────────────┘                          │  (CDN-backed)│
                                                              └──────────────┘
                                                                     │
                                                              ┌──────────────┐
                                                              │  Synology    │
                                                              │  DS1525+     │
                                                              │  (archive)   │
                                                              └──────────────┘
```

## Design 1: PDF Caching Pipeline

### Problem
Every PDF view triggers: DB query → React PDF render → stream to browser.
At 14 employees viewing invoices daily, this is ~50-100 renders/day.
At 50 employees + customer portal: 500-1000 renders/day.

### Solution: Generate-Once, Serve-Cached

```
                    ┌─────────────────────────────────┐
                    │         PDF Request Flow         │
                    └─────────────────────────────────┘

User clicks "View PDF"
         │
         ▼
┌─────────────────┐
│ Check Supabase  │──── Cache HIT ────▶ Redirect to Storage URL
│ Storage for     │                     (instant, no render)
│ cached PDF      │
└─────────────────┘
         │
    Cache MISS
         │
         ▼
┌─────────────────┐
│ Fetch data from │
│ database        │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Render PDF with │
│ @react-pdf      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Upload to       │
│ generated-docs  │──── Store with key: {type}/{id}/{hash}.pdf
│ bucket          │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Return PDF to   │
│ user            │
└─────────────────┘
```

### Cache Key Strategy
```
generated-documents/
├── invoice/{invoice_id}/{content_hash}.pdf
├── quotation/{quotation_id}/{content_hash}.pdf
├── surat-jalan/{jo_id}/{content_hash}.pdf
└── berita-acara/{jo_id}/{content_hash}.pdf
```

`content_hash` = SHA256 of the source data used to generate the PDF.
When source data changes → hash changes → next request triggers regeneration.

### Implementation (Phase 2)
```typescript
// lib/pdf/pdf-cache.ts
export async function getCachedPdf(
  type: string,
  id: string,
  dataHash: string
): Promise<string | null> {
  const supabase = await createClient()
  const path = `${type}/${id}/${dataHash}.pdf`
  const { data } = supabase.storage
    .from('generated-documents')
    .getPublicUrl(path)

  // Check if file exists (HEAD request)
  const response = await fetch(data.publicUrl, { method: 'HEAD' })
  return response.ok ? data.publicUrl : null
}

export async function cachePdf(
  type: string,
  id: string,
  dataHash: string,
  pdfBuffer: Buffer
): Promise<string> {
  const supabase = await createClient()
  const path = `${type}/${id}/${dataHash}.pdf`

  await supabase.storage
    .from('generated-documents')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  const { data } = supabase.storage
    .from('generated-documents')
    .getPublicUrl(path)

  return data.publicUrl
}
```

### Storage Lifecycle
- **Hot** (0-30 days): Supabase Storage → served via CDN
- **Cold** (30-180 days): Auto-move to Synology DS1525+ via nightly cron
- **Archive** (180+ days): Synology only, delete from Supabase Storage

## Design 2: Cursor Pagination

### Problem
List views load all records. At 500+ records per table, this causes:
- Slow initial page load
- Memory pressure on client
- Unnecessary bandwidth

### Solution: Keyset/Cursor Pagination

```typescript
// lib/utils/pagination.ts

export interface PaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number  // optional, expensive to compute
}

export interface PaginationParams {
  cursor?: string      // opaque cursor (base64 encoded)
  pageSize?: number    // default 25
  direction?: 'forward' | 'backward'
}

// Cursor encodes: { field: string, value: string, id: string }
// This allows consistent pagination even with concurrent inserts/deletes

export function decodeCursor(cursor: string): { field: string; value: string; id: string } {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString())
}

export function encodeCursor(field: string, value: string, id: string): string {
  return Buffer.from(JSON.stringify({ field, value, id })).toString('base64url')
}
```

### Usage Pattern
```typescript
// In a server action:
export async function getJobOrders(params: PaginationParams) {
  const pageSize = params.pageSize || 25
  const supabase = await createClient()

  let query = supabase
    .from('job_orders')
    .select('id, jo_number, status, created_at')
    .order('created_at', { ascending: false })
    .limit(pageSize + 1)  // fetch one extra to know if there's more

  if (params.cursor) {
    const { value, id } = decodeCursor(params.cursor)
    query = query.or(`created_at.lt.${value},and(created_at.eq.${value},id.lt.${id})`)
  }

  const { data } = await query
  const hasMore = (data?.length || 0) > pageSize
  const items = data?.slice(0, pageSize) || []

  const lastItem = items[items.length - 1]
  const nextCursor = hasMore && lastItem
    ? encodeCursor('created_at', lastItem.created_at, lastItem.id)
    : null

  return { data: items, nextCursor, hasMore }
}
```

### Why Cursor Over Offset
| Feature | OFFSET pagination | Cursor pagination |
|---------|-------------------|-------------------|
| Performance at page 100 | Slow (scans 2500 rows) | Fast (index seek) |
| Consistent with inserts | Duplicates/gaps | Stable |
| Bookmarkable URLs | Yes (page=5) | No (opaque cursor) |
| Random page access | Yes | No (sequential only) |

For an ERP with growing data, cursor wins. Random access is rare — users browse sequentially.

## Design 3: Reference Data Caching (Vercel KV)

### Problem
Dropdown data (customers, employees, categories) is:
- Queried on every page that has a form
- Rarely changes (customers update monthly, employees quarterly)
- Same data for all users

### Solution: Vercel KV (Redis) with TTL

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Server      │────▶│  Vercel KV   │────▶│  Supabase    │
│  Action      │     │  (Redis)     │     │  (PostgreSQL)│
│              │◀────│  TTL: 10min  │◀────│              │
└──────────────┘     └──────────────┘     └──────────────┘
```

```typescript
// lib/cache/kv-cache.ts
import { kv } from '@vercel/kv'

const TTL = {
  customers: 600,      // 10 min
  employees: 600,      // 10 min
  categories: 3600,    // 1 hour
  ports: 86400,        // 24 hours (rarely change)
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await kv.get<T>(key)
  if (cached) return cached

  const data = await fetcher()
  await kv.set(key, data, { ex: ttl })
  return data
}

// Invalidate on mutation
export async function invalidate(pattern: string) {
  const keys = await kv.keys(pattern)
  if (keys.length) await kv.del(...keys)
}
```

### Cost Estimate
- Vercel KV Hobby: Free (30MB, 3000 req/day)
- Vercel KV Pro: $1/100MB ($3-5/month estimated for GIS-ERP)
- Self-hosted Redis on Mac Mini: $0 (alternative)

## Design 4: Database Index Strategy

### High-Traffic Query Patterns (from audit)

| Query Pattern | Tables | Current Index | Needed |
|---------------|--------|---------------|--------|
| Job orders by status + date | job_orders | PK only | Composite: (status, created_at DESC) |
| Invoices by customer + status | invoices | PK only | Composite: (customer_id, status) |
| Attendance by employee + date | attendance_records | PK only | Composite: (employee_id, attendance_date) |
| Incidents by status + severity | incidents | PK only | Composite: (status, severity, incident_date DESC) |
| Safety permits by status | safety_permits | PK only | Single: (status) + (valid_to) for expiry check |

### Implementation
```sql
-- Run via Supabase migration
CREATE INDEX CONCURRENTLY idx_job_orders_status_created
  ON job_orders (status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_invoices_customer_status
  ON invoices (customer_id, status);

CREATE INDEX CONCURRENTLY idx_attendance_employee_date
  ON attendance_records (employee_id, attendance_date);

CREATE INDEX CONCURRENTLY idx_incidents_status_severity
  ON incidents (status, severity, incident_date DESC);

CREATE INDEX CONCURRENTLY idx_safety_permits_status
  ON safety_permits (status);

CREATE INDEX CONCURRENTLY idx_safety_permits_valid_to
  ON safety_permits (valid_to) WHERE status IN ('pending', 'approved', 'active');
```

`CONCURRENTLY` = non-blocking, safe to run on live database.

## Design 5: Storage Lifecycle (Synology Integration)

```
┌───────────────────────────────────────────────────────────┐
│                    Document Lifecycle                       │
│                                                            │
│  Day 0          Day 30           Day 180         Day 365+  │
│    │               │                │               │      │
│    ▼               ▼                ▼               │      │
│  Generate    Auto-compress     Move to Synology     │      │
│  + Cache     (gzip in bucket)  Delete from Supabase │      │
│  in Supabase                                        │      │
│                                        Synology     │      │
│                                        retains      │      │
│                                        indefinitely │      │
│                                                     ▼      │
│                                              Review for    │
│                                              legal hold    │
└───────────────────────────────────────────────────────────┘
```

### Cron Job (on Mac Mini)
```bash
#!/bin/bash
# archive-old-documents.sh — runs monthly via cron

BUCKET="generated-documents"
CUTOFF=$(date -v-180d +%Y-%m-%d)  # 180 days ago

# List files older than cutoff
supabase storage ls "$BUCKET" --project-ref ljbkjtaowrdddvjhsygj | \
  while read -r file; do
    modified=$(supabase storage info "$BUCKET/$file" --json | jq -r '.updated_at')
    if [[ "$modified" < "$CUTOFF" ]]; then
      # Download to Synology
      supabase storage cp "$BUCKET/$file" "/volume1/homes/Dio/vibecode-backups/documents/$file"
      # Delete from Supabase
      supabase storage rm "$BUCKET/$file"
      echo "Archived: $file"
    fi
  done
```

## Priority Matrix

| Design | Impact | Effort | Dependencies | When |
|--------|--------|--------|-------------|------|
| PDF Caching | HIGH | 8h | None | Phase 2 (March) |
| Cursor Pagination | HIGH | 16h | UI changes | Phase 2 (April) |
| DB Indexes | HIGH | 2h | Migration | Phase 2 (March) |
| Vercel KV Cache | MEDIUM | 4h | Vercel Pro plan | Phase 4 (Q3) |
| Storage Lifecycle | MEDIUM | 4h | Synology cron | Phase 4 (Q3) |

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-26 | Monolith first, microservices later | 14 employees, 1 developer. Complexity overhead not justified. |
| 2026-02-26 | Supabase stays as primary DB | 299 tables with RLS. Migration cost >200h with zero user benefit. |
| 2026-02-26 | Cursor > Offset pagination | ERP data grows monotonically. Cursor is O(1) vs O(n) at scale. |
| 2026-02-26 | PDF cache in Supabase Storage | Already have `generated-documents` bucket. CDN-backed. Zero infra cost. |
| 2026-02-26 | Synology for cold storage | Already purchased DS1525+. Free storage vs cloud costs. |
