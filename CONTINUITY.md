# Continuity Ledger - v0.60 Engineering Resource Scheduling

## Goal (incl. success criteria):
Complete v0.60 Engineering Resource Scheduling module implementation, review/fix bugs, push to GitHub.
- Database schema ✅
- TypeScript types ✅
- Core utilities ✅
- Property tests (47 passing) ✅
- Server actions ✅
- UI components ✅
- Pages ✅
- Navigation integration ✅

## Constraints/Assumptions:
- Next.js 15 + TypeScript + TailwindCSS + shadcn/ui
- Supabase project ID: ljbkjtaowrdddvjhsygj
- Follow existing patterns from steering files
- Property tests use fast-check with 100 iterations minimum

## Key decisions:
- Resource types: personnel, equipment, tool, vehicle
- Assignment targets: project, job_order, assessment, route_survey, jmp
- Calendar view shows week/month with resource rows
- Utilization calculated as (assigned_hours / available_hours) × 100
- Toast notifications use sonner library

## State:

### Done:
- Task 1: Database schema (MCP)
- Task 2: TypeScript types
- Tasks 3-6: Core utilities + property tests (47 tests passing)
- Tasks 7-10: Server actions (Resources, Assignments, Availability, Calendar, Utilization)
- Task 13-16: UI Components (resource-list, resource-form, resource-detail, skill-selector, certification-editor, calendar components, assignment-dialog, availability-form, utilization-report)
- Task 18: Pages (resources list, new, detail, edit)
- Task 19: Navigation integration (added Resources to Engineering menu)

### Now:
- Push to GitHub

### Next:
- Done

## Open questions:
None

## Working set:
- types/resource-scheduling.ts
- lib/resource-scheduling-utils.ts
- lib/resource-scheduling-actions.ts
- __tests__/resource-scheduling-utils.property.test.ts
- components/resource-scheduling/*
- app/(main)/engineering/resources/*
- lib/navigation.ts
