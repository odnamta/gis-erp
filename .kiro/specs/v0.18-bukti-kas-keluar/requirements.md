# Requirements Document

## Introduction

The Bukti Kas Keluar (BKK) system manages cash disbursement requests for job order operations. It enables Operations staff to request cash advances linked to specific JO cost items, tracks the approval workflow through Finance/Admin, manages cash release, and handles settlement with actual receipts. The system ensures budget compliance and maintains a complete audit trail of all cash movements.

## Glossary

- **BKK**: Bukti Kas Keluar - Cash Disbursement Voucher
- **JO**: Job Order - Active work order linked to a PJO
- **PJO_Cost_Item**: Budget line item from the Proforma Job Order
- **Requester**: Operations staff who initiates the cash request
- **Approver**: Admin/Finance staff who approves or rejects requests
- **Cashier**: Staff who releases the physical cash or transfer
- **Settlement**: Process of reconciling actual spending with released amount

## Requirements

### Requirement 1: BKK Request Creation

**User Story:** As an Operations staff member, I want to request cash disbursement linked to a specific JO cost item, so that I can obtain funds for operational expenses.

#### Acceptance Criteria

1. WHEN an Operations user navigates to a JO detail page, THE System SHALL display a "Request BKK" button in the Cash Disbursements section
2. WHEN creating a BKK request, THE System SHALL auto-generate a unique BKK number in format "BKK-YYYY-NNNN"
3. WHEN selecting a cost item, THE System SHALL display the budget amount, already disbursed amount, and available balance
4. WHEN the requested amount exceeds available budget, THE System SHALL display a warning message but allow submission
5. WHEN submitting a BKK request, THE System SHALL validate that purpose and amount_requested are provided
6. WHEN a BKK request is submitted, THE System SHALL set status to "pending" and record requested_by and requested_at

### Requirement 2: BKK Approval Workflow

**User Story:** As a Finance/Admin staff member, I want to review and approve or reject BKK requests, so that I can control cash disbursements.

#### Acceptance Criteria

1. WHEN a BKK has status "pending", THE Approver SHALL be able to approve or reject the request
2. WHEN approving a BKK, THE System SHALL set status to "approved", record approved_by and approved_at
3. WHEN rejecting a BKK, THE System SHALL require a rejection_reason and set status to "rejected"
4. WHEN a BKK is rejected, THE System SHALL record the rejection_reason, approved_by, and approved_at
5. WHILE a BKK has status "pending", THE Requester SHALL be able to cancel the request

### Requirement 3: Cash Release

**User Story:** As a Cashier, I want to record cash release for approved BKK requests, so that I can track actual cash movements.

#### Acceptance Criteria

1. WHEN a BKK has status "approved", THE Cashier SHALL be able to mark it as released
2. WHEN releasing cash, THE System SHALL require release_method (cash or transfer) and optional release_reference
3. WHEN cash is released, THE System SHALL set status to "released", record released_by and released_at
4. WHEN a BKK is released, THE System SHALL display the release details on the BKK record

### Requirement 4: BKK Settlement

**User Story:** As an Operations staff member, I want to settle a BKK with actual spending and receipts, so that I can account for the cash used.

#### Acceptance Criteria

1. WHEN a BKK has status "released", THE Requester SHALL be able to submit a settlement
2. WHEN settling a BKK, THE System SHALL require amount_spent to be entered
3. WHEN amount_spent is less than released amount, THE System SHALL calculate amount_returned as the difference
4. WHEN amount_spent is greater than released amount, THE System SHALL display the additional amount needed
5. WHEN settling a BKK, THE System SHALL allow uploading receipt images to receipt_urls
6. WHEN a settlement is submitted, THE System SHALL set status to "settled", record settled_by and settled_at
7. WHEN a BKK is settled, THE System SHALL update the linked pjo_cost_items.actual_amount with amount_spent
8. IF the settled amount_spent exceeds the budget_amount, THEN THE System SHALL set pjo_cost_items.status to "exceeded"
9. IF the settled amount_spent is within budget, THEN THE System SHALL set pjo_cost_items.status to "confirmed"

### Requirement 5: BKK List Display

**User Story:** As a user, I want to view all BKK records for a Job Order, so that I can track cash disbursements.

#### Acceptance Criteria

1. WHEN viewing a JO detail page, THE System SHALL display a Cash Disbursements (BKK) section
2. THE BKK list SHALL display BKK number, purpose, amount requested, status, amount spent, and action buttons
3. THE BKK section SHALL display summary totals: total requested, total released, total settled, and pending return
4. WHEN a BKK has status "pending", THE System SHALL display a "Cancel" action
5. WHEN a BKK has status "released", THE System SHALL display a "Settle" action
6. WHEN a BKK has status "settled", THE System SHALL display a "View" action

### Requirement 6: Finance Dashboard Integration

**User Story:** As a Finance staff member, I want to see pending BKK approvals on my dashboard, so that I can quickly process requests.

#### Acceptance Criteria

1. THE Finance Dashboard SHALL display a "Pending BKK Approvals" section
2. THE pending approvals list SHALL show BKK number, JO reference, amount, requester name, and action buttons
3. WHEN clicking approve, THE System SHALL approve the BKK and refresh the list
4. WHEN clicking reject, THE System SHALL prompt for rejection reason before rejecting

### Requirement 7: Budget Validation

**User Story:** As a system administrator, I want the system to track budget utilization through BKK, so that spending is controlled.

#### Acceptance Criteria

1. WHEN creating a BKK, THE System SHALL calculate available budget as: budget_amount - sum of all non-rejected BKK amounts for that cost item
2. WHEN displaying a cost item, THE System SHALL show total disbursed amount from linked BKKs
3. THE System SHALL prevent creating a BKK for a cost item that has status "confirmed" or "exceeded"

### Requirement 8: BKK Status Display

**User Story:** As a user, I want to see clear status indicators for BKK records, so that I can understand the current state.

#### Acceptance Criteria

1. THE System SHALL display status badges with appropriate colors: pending (yellow), approved (blue), rejected (red), released (green), settled (gray), returned (purple)
2. WHEN hovering over a status badge, THE System SHALL display additional status details (timestamps, user names)
