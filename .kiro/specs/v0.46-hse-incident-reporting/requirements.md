# Requirements: v0.46 HSE - Incident Reporting

## Overview

Create a comprehensive incident reporting system for capturing workplace accidents, near-misses, and safety violations with proper investigation workflows.

**Why it matters**: Heavy-haul logistics involves high-risk operations. Proper incident tracking is essential for regulatory compliance, insurance claims, and most importantly, preventing future incidents.

## Functional Requirements

### 1. Incident Categories Management

- 1.1 System shall provide predefined incident categories (injury, near_miss, vehicle_accident, property_damage, equipment_failure, environmental, fire, security, violation, other)
- 1.2 Each category shall have configurable severity default, investigation requirement, and regulatory reporting flags
- 1.3 Categories shall be orderable for display purposes
- 1.4 Categories shall support active/inactive status for soft-delete

### 2. Incident Reporting

- 2.1 System shall auto-generate unique incident numbers in format INC-YYYY-NNNNN
- 2.2 Users shall classify incidents by category, type (accident/near_miss/observation/violation), and severity (low/medium/high/critical)
- 2.3 Users shall record incident date, time, and location (type, name, address, GPS coordinates)
- 2.4 Users shall provide incident title, description, and immediate actions taken
- 2.5 System shall allow linking incidents to job orders and assets
- 2.6 Users shall add multiple people involved with types: injured, witness, involved, first_responder
- 2.7 For injured persons, system shall capture injury type, description, body part, treatment level, and days lost
- 2.8 Users shall upload photos and documents as evidence
- 2.9 System shall notify supervisor and HSE team upon incident submission

### 3. Investigation Workflow

- 3.1 System shall track incident status: reported → under_investigation → pending_actions → closed/rejected
- 3.2 HSE officers shall be assignable as investigators
- 3.3 Investigators shall document root cause analysis
- 3.4 System shall provide contributing factor checkboxes (equipment failure, procedure not followed, human error, environmental conditions, training gap)
- 3.5 System shall log all status changes and actions in incident history

### 4. Corrective & Preventive Actions

- 4.1 Users shall add corrective actions with description, responsible person, and due date
- 4.2 Users shall add preventive actions with description, responsible person, and due date
- 4.3 Actions shall track status: pending → in_progress → completed → overdue
- 4.4 System shall notify responsible persons when actions are assigned
- 4.5 System shall prevent incident closure until all actions are completed

### 5. Incident Closure

- 5.1 System shall require closure notes when closing an incident
- 5.2 System shall validate all corrective and preventive actions are completed before closure
- 5.3 System shall record closure timestamp and user

### 6. Cost & Insurance Tracking

- 6.1 Users shall record estimated and actual incident costs
- 6.2 Users shall track insurance claim number and status
- 6.3 Users shall record authority reporting details (date, reference number)

### 7. HSE Dashboard

- 7.1 Dashboard shall display summary cards: open incidents, under investigation, near misses (MTD), injuries (MTD), days since last LTI
- 7.2 Dashboard shall list recent incidents with severity indicators
- 7.3 Dashboard shall show incident trend chart (last 6 months)
- 7.4 Dashboard shall highlight open investigations by severity priority

### 8. Statistics & Reporting

- 8.1 System shall calculate total incidents, near misses, injuries, and days lost by period
- 8.2 System shall provide breakdown by severity and category
- 8.3 System shall track open vs closed investigation counts

## Non-Functional Requirements

### 9. Performance

- 9.1 Incident list shall load within 2 seconds for up to 1000 records
- 9.2 Dashboard statistics shall be pre-aggregated via database views

### 10. Security

- 10.1 All tables shall have RLS policies enabled
- 10.2 Only HSE roles and managers shall start/update investigations
- 10.3 All employees shall be able to report incidents
- 10.4 Incident history shall be immutable (append-only)

### 11. Usability

- 11.1 Report incident form shall be mobile-friendly for field reporting
- 11.2 Photo upload shall support camera capture on mobile devices
- 11.3 UI labels shall be in Indonesian where appropriate
