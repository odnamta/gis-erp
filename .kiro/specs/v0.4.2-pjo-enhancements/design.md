# Design: PJO Enhancements v0.4.2

## 1. Database Changes

### 1.1 Alter proforma_job_orders (for location data)
```sql
ALTER TABLE proforma_job_orders 
ADD COLUMN pol_place_id TEXT,           -- Google Place ID for consistency
ADD COLUMN pol_lat DECIMAL(10,7),
ADD COLUMN pol_lng DECIMAL(10,7),
ADD COLUMN pod_place_id TEXT,           -- Google Place ID for consistency
ADD COLUMN pod_lat DECIMAL(10,7),
ADD COLUMN pod_lng DECIMAL(10,7),
ADD COLUMN has_cost_overruns BOOLEAN DEFAULT FALSE;

-- Index for location analysis queries
CREATE INDEX idx_pjo_pol_place_id ON proforma_job_orders(pol_place_id);
CREATE INDEX idx_pjo_pod_place_id ON proforma_job_orders(pod_place_id);
```

### 1.2 RLS Policies

```sql
-- pjo_revenue_items RLS
ALTER TABLE pjo_revenue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view revenue items" ON pjo_revenue_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert revenue items" ON pjo_revenue_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update revenue items" ON pjo_revenue_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete revenue items" ON pjo_revenue_items
  FOR DELETE TO authenticated USING (true);

-- pjo_cost_items RLS
ALTER TABLE pjo_cost_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost items" ON pjo_cost_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert cost items" ON pjo_cost_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update cost items" ON pjo_cost_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete cost items" ON pjo_cost_items
  FOR DELETE TO authenticated USING (true);

-- job_orders RLS
ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job orders" ON job_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert job orders" ON job_orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update job orders" ON job_orders
  FOR UPDATE TO authenticated USING (true);
```

---

## 2. Validation Logic

### 2.1 Positive Margin Validation
```typescript
// In pjo-detail-view.tsx handleSubmitForApproval()
function validatePositiveMargin(totalRevenue: number, totalCost: number): ValidationResult {
  if (totalCost >= totalRevenue) {
    const margin = totalRevenue > 0 
      ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(2)
      : 0
    return {
      valid: false,
      error: `Cannot submit: Estimated cost (${formatIDR(totalCost)}) exceeds or equals revenue (${formatIDR(totalRevenue)}). Current margin: ${margin}%`
    }
  }
  return { valid: true }
}
```

### 2.2 Date Validation (ETA >= ETD)
```typescript
// In pjo-form.tsx
const pjoFormSchema = z.object({
  // ... existing fields
  etd: z.date().optional(),
  eta: z.date().optional(),
}).refine((data) => {
  if (data.etd && data.eta) {
    return data.eta >= data.etd
  }
  return true
}, {
  message: "ETA must be on or after ETD",
  path: ["eta"]
})
```

### 2.3 Budget Warning (90% threshold)
```typescript
// In cost-confirmation-section.tsx
function getBudgetWarningLevel(estimated: number, actual: number): 'safe' | 'warning' | 'exceeded' {
  if (actual > estimated) return 'exceeded'
  if (actual >= estimated * 0.9) return 'warning'
  return 'safe'
}
```

---

## 3. Component Updates

### 3.1 Cost Confirmation Section Enhancement
- Add yellow warning indicator when actual >= 90% of estimated
- Show "90% of budget used" message

### 3.2 PJO List Enhancement
- Add "Overruns" column or badge
- Add filter option for "Has Overruns"

### 3.3 New Component: PlacesAutocomplete
```typescript
// components/ui/places-autocomplete.tsx
interface LocationData {
  formattedAddress: string
  placeId: string
  lat: number
  lng: number
}

interface PlacesAutocompleteProps {
  value: string
  onChange: (value: string, locationData?: LocationData) => void
  placeholder?: string
  disabled?: boolean
  restrictToCountry?: string  // Default: 'id' (Indonesia)
}
```

### 3.4 PJO Form Updates
- Replace POL/POD text inputs with PlacesAutocomplete
- Add ETA validation against ETD
- Store coordinates when location selected

---

## 4. Google Maps Integration

### 4.1 Environment Variables
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 4.2 Script Loading
```typescript
// app/layout.tsx or specific pages
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
  strategy="lazyOnload"
/>
```

### 4.3 Autocomplete Implementation
- Use Google Places Autocomplete API
- Filter to Indonesia region (optional)
- Extract formatted_address, lat, lng from result

---

## 5. Server Action Updates

### 5.1 Update PJO Actions
```typescript
// In proforma-jo/actions.ts
export async function updatePJOOverrunStatus(pjoId: string): Promise<void> {
  // Check if any cost items have status 'exceeded'
  // Update has_cost_overruns flag on PJO
}
```

### 5.2 Trigger Overrun Check
- Call updatePJOOverrunStatus after confirmActualCost
- Include in cost-actions.ts

---

## 6. UI Indicators

### 6.1 Budget Warning Colors
| Level | Color | Icon | Condition |
|-------|-------|------|-----------|
| Safe | Green | ✅ | actual < 90% of estimated |
| Warning | Yellow | ⚠️ | actual >= 90% AND actual <= estimated |
| Exceeded | Red | 🚫 | actual > estimated |

### 6.2 PJO List Overrun Badge
```tsx
{pjo.has_cost_overruns && (
  <Badge variant="destructive" className="ml-2">
    Overruns
  </Badge>
)}
```

---

## 7. Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Positive Margin Enforcement
*For any* PJO submission attempt, if total estimated cost >= total revenue, the submission SHALL be rejected with an error message.
**Validates: Requirements 1.1, 1.2**

### Property 2: Date Order Validation
*For any* PJO with both ETD and ETA set, ETA SHALL always be >= ETD.
**Validates: Requirements 4.1, 4.2**

### Property 3: Budget Warning Threshold
*For any* cost item where actual_amount >= 0.9 * estimated_amount AND actual_amount <= estimated_amount, the system SHALL display a warning indicator.
**Validates: Requirements 2.1, 2.2**

### Property 4: Overrun Flag Consistency
*For any* PJO, has_cost_overruns SHALL be true if and only if at least one cost item has status 'exceeded'.
**Validates: Requirements 3.1, 3.2**

---

## 8. Testing Strategy

### Unit Tests
- Test validatePositiveMargin function
- Test getBudgetWarningLevel function
- Test date validation in form schema

### Property-Based Tests
- Generate random revenue/cost combinations, verify margin validation
- Generate random ETD/ETA pairs, verify date validation
- Generate random cost items, verify warning level calculation

### Integration Tests
- Test PJO submission blocked when margin negative
- Test form validation prevents ETA before ETD
- Test overrun flag updates correctly
