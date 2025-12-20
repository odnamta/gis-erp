# Requirements Document

## Introduction

This document defines the requirements for the HR Leave Management module (v0.30) in Gama ERP. The module enables employees to request various types of leave (annual, sick, maternity, etc.) with an approval workflow, balance tracking, and integration with the attendance system.

## Glossary

- **Leave_Management_System**: The module responsible for managing employee leave requests, balances, and approvals
- **Leave_Type**: A category of leave (e.g., Annual, Sick, Maternity) with specific entitlements and rules
- **Leave_Balance**: The tracking of entitled, used, pending, and available leave days per employee per year
- **Leave_Request**: A formal request from an employee to take time off
- **Leave_Request_Form**: The UI component for submitting leave requests
- **Leave_Balance_Display**: The UI component showing an employee's leave entitlements and usage
- **Approval_Workflow**: The process by which managers review and approve/reject leave requests
- **Working_Days_Calculator**: The function that calculates business days excluding weekends and holidays
- **Carry_Over**: The process of transferring unused leave days to the next year

## Requirements

### Requirement 1: Leave Types Configuration

**User Story:** As an HR administrator, I want to configure different leave types with specific rules, so that the system can enforce appropriate policies for each type of leave.

#### Acceptance Criteria

1. THE Leave_Management_System SHALL support the following default leave types: Annual Leave (12 days), Sick Leave (14 days), Maternity Leave (90 days), Paternity Leave (3 days), Marriage Leave (3 days), Bereavement Leave (3 days), and Unpaid Leave (0 days)
2. WHEN a leave type is configured, THE Leave_Management_System SHALL store the type code, type name, default days per year, carry-over settings, approval requirements, attachment requirements, minimum advance notice days, and paid/unpaid status
3. WHEN Sick Leave is selected, THE Leave_Request_Form SHALL require an attachment (medical certificate)
4. WHEN Annual Leave is requested, THE Leave_Management_System SHALL enforce a minimum 3-day advance notice
5. WHEN Bereavement Leave or Sick Leave is requested, THE Leave_Management_System SHALL allow same-day requests (0 days advance notice)

### Requirement 2: Leave Balance Management

**User Story:** As an employee, I want to view my leave balances, so that I can plan my time off knowing how many days I have available.

#### Acceptance Criteria

1. THE Leave_Balance_Display SHALL show entitled days, used days, pending days, carried-over days, and available days for each leave type
2. THE Leave_Management_System SHALL calculate available days as: entitled_days + carried_over_days - used_days - pending_days
3. WHEN a new year begins, THE Leave_Management_System SHALL initialize leave balances for all active employees
4. WHEN a leave type allows carry-over, THE Leave_Management_System SHALL transfer unused days up to the maximum carry-over limit to the next year
5. THE Leave_Management_System SHALL support half-day (0.5) increments for leave balances

### Requirement 3: Leave Request Submission

**User Story:** As an employee, I want to submit leave requests with all necessary details, so that my manager can review and approve my time off.

#### Acceptance Criteria

1. WHEN an employee submits a leave request, THE Leave_Request_Form SHALL capture: leave type, start date, end date, reason, emergency contact, handover person, and handover notes
2. WHEN a leave request is submitted, THE Leave_Management_System SHALL auto-generate a unique request number in format LV-YYYY-NNNN
3. WHEN calculating leave duration, THE Working_Days_Calculator SHALL exclude weekends (Saturday and Sunday)
4. WHEN calculating leave duration, THE Working_Days_Calculator SHALL exclude company holidays
5. WHEN an employee selects half-day leave, THE Leave_Request_Form SHALL allow selection of morning or afternoon
6. WHEN a leave request is submitted, THE Leave_Management_System SHALL validate that the employee has sufficient available balance
7. IF the employee has insufficient balance, THEN THE Leave_Management_System SHALL reject the submission with an error message showing available days
8. WHEN a leave request is submitted successfully, THE Leave_Management_System SHALL update the pending_days in the employee's balance

### Requirement 4: Leave Request Approval Workflow

**User Story:** As a manager, I want to review and approve/reject leave requests from my team, so that I can ensure adequate staffing and fair leave distribution.

#### Acceptance Criteria

1. WHEN a leave request is submitted, THE Leave_Management_System SHALL send a notification to the employee's manager
2. WHEN a manager views pending requests, THE Leave_Management_System SHALL display: employee name, leave type, dates, duration, reason, handover details, and current balance
3. WHEN a manager approves a leave request, THE Leave_Management_System SHALL update the request status to 'approved', record the approver and timestamp
4. WHEN a leave request is approved, THE Leave_Management_System SHALL move days from pending_days to used_days in the balance
5. WHEN a leave request is approved, THE Leave_Management_System SHALL mark the corresponding attendance records as leave
6. WHEN a manager rejects a leave request, THE Leave_Management_System SHALL require a rejection reason
7. WHEN a leave request is rejected, THE Leave_Management_System SHALL return the pending_days to available balance
8. WHEN a leave request is approved or rejected, THE Leave_Management_System SHALL notify the employee

### Requirement 5: Leave Request Cancellation

**User Story:** As an employee, I want to cancel my pending leave requests, so that I can change my plans if needed.

#### Acceptance Criteria

1. WHILE a leave request status is 'pending', THE Leave_Management_System SHALL allow the employee to cancel it
2. WHEN a leave request is cancelled, THE Leave_Management_System SHALL return the pending_days to available balance
3. WHEN a leave request is cancelled, THE Leave_Management_System SHALL update the status to 'cancelled'
4. IF a leave request is already approved, THEN THE Leave_Management_System SHALL NOT allow cancellation by the employee

### Requirement 6: Leave Requests List View (Admin)

**User Story:** As an HR administrator, I want to view all leave requests with filtering options, so that I can monitor leave patterns and manage approvals efficiently.

#### Acceptance Criteria

1. THE Leave_Management_System SHALL display pending requests prominently with approve/reject actions
2. THE Leave_Management_System SHALL allow filtering by: employee, leave type, status, and date range
3. THE Leave_Management_System SHALL show a count of pending requests requiring attention
4. WHEN displaying a leave request, THE Leave_Management_System SHALL show: request number, employee name, department, leave type, dates, duration, status, and available actions

### Requirement 7: My Leave View (Employee)

**User Story:** As an employee, I want to view my leave history and balances in one place, so that I can track my time off usage.

#### Acceptance Criteria

1. THE Leave_Balance_Display SHALL show balance cards for Annual Leave, Sick Leave, and other applicable leave types
2. THE Leave_Management_System SHALL display the employee's leave request history with status
3. WHEN viewing a pending request, THE Leave_Management_System SHALL show a cancel option
4. WHEN viewing an approved or rejected request, THE Leave_Management_System SHALL show a view details option

### Requirement 8: Attachment Handling

**User Story:** As an employee, I want to upload supporting documents with my leave request, so that I can provide required evidence (e.g., medical certificates).

#### Acceptance Criteria

1. WHEN a leave type requires attachment, THE Leave_Request_Form SHALL show an upload field
2. WHEN an attachment is uploaded, THE Leave_Management_System SHALL store it securely and link it to the request
3. WHEN viewing a leave request with attachment, THE Leave_Management_System SHALL display a link to download/view the attachment
