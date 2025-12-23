# Continuity Ledger

## Goal
v0.72 Agency - Booking Management - Spec complete, ready for implementation

## Constraints/Assumptions
- Next.js 15 + TypeScript + Supabase stack
- Supabase project ID: ljbkjtaowrdddvjhsygj
- Builds on v0.71 Agency - Shipping Line & Agent Management (complete)
- Uses existing shipping_lines, ports, shipping_rates tables from v0.71

## Key Decisions
- Booking number format: BKG-YYYY-NNNNN
- Status workflow: draft → requested → confirmed → amended → shipped → completed
- Amendment tracking with old/new value JSON storage
- Container management as separate table linked to bookings
- 8 correctness properties for property-based testing
- All property tests required (comprehensive approach)

## State
- Done: 
  - v0.71 complete
  - Created requirements.md for v0.72 (10 requirements)
  - Created design.md for v0.72 (8 correctness properties)
  - Created tasks.md for v0.72 (20 task groups, all required)
- Now: Spec complete
- Next: User can start implementation by opening tasks.md and clicking "Start task"

## Open Questions
- None

## Working Set
- .kiro/specs/v0.72-agency-booking-management/requirements.md
- .kiro/specs/v0.72-agency-booking-management/design.md
- .kiro/specs/v0.72-agency-booking-management/tasks.md
