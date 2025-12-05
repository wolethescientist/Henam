# Requirements Document: Manual Job Creation with Duplicate Prevention

## Introduction

This feature adds the ability to manually create jobs directly from the Jobs page while maintaining the existing automatic job creation from paid invoices. The system must prevent duplicate jobs for the same client/project and intelligently link invoices to existing jobs.

## Glossary

- **Job Management System**: The application that manages jobs, invoices, teams, and assignments
- **Manual Job**: A job created directly by a user through the Jobs page interface
- **Auto-Created Job**: A job automatically created when an invoice receives payment
- **Job-Invoice Link**: The relationship between a job and its associated invoices
- **Duplicate Job**: Multiple job records for the same client and project/title
- **Client Identifier**: The client name used to match jobs and invoices
- **Job Identifier**: Combination of client name and job title used for uniqueness

## Requirements

### Requirement 1: Manual Job Creation

**User Story:** As a project manager, I want to create jobs directly from the Jobs page, so that I can set up projects before invoices are created.

#### Acceptance Criteria

1. WHEN the user clicks "Create Job" button on the Jobs page, THE Job Management System SHALL display a job creation form
2. WHEN the user submits the job creation form with valid data, THE Job Management System SHALL create a new job record in the database
3. WHEN a job is manually created, THE Job Management System SHALL set the job status to "NOT_STARTED" with 0% progress
4. WHEN a job is manually created, THE Job Management System SHALL record the current user as the job creator (assigner_id)
5. WHEN a job is manually created, THE Job Management System SHALL send notifications to assigned team members and supervisor

### Requirement 2: Duplicate Prevention During Manual Creation

**User Story:** As a project manager, I want the system to warn me if a similar job already exists, so that I don't accidentally create duplicate jobs.

#### Acceptance Criteria

1. WHEN the user attempts to create a job, THE Job Management System SHALL check for existing jobs with the same client name and similar job title that are NOT completed
2. IF an existing job matches the client name and job title (case-insensitive) with status "NOT_STARTED" or "IN_PROGRESS", THEN THE Job Management System SHALL display a warning dialog showing the existing job details
3. WHEN a duplicate warning is shown, THE Job Management System SHALL provide options to "View Existing Job", "Create Anyway", or "Cancel"
4. IF the user selects "Create Anyway", THEN THE Job Management System SHALL create the new job and log the duplicate creation decision with user justification
5. IF an existing job with the same client and title has status "COMPLETED", THEN THE Job Management System SHALL allow creation without warning (assuming it's a repeat project)

### Requirement 3: Smart Invoice-to-Job Linking

**User Story:** As a project manager, I want invoices to automatically link to existing jobs when possible, so that I don't have duplicate jobs created from invoice payments.

#### Acceptance Criteria

1. WHEN an invoice receives payment, THE Job Management System SHALL search for existing jobs matching the invoice client name with status "NOT_STARTED" or "IN_PROGRESS"
2. IF exactly one matching job is found for the client, THEN THE Job Management System SHALL link the invoice to that job instead of creating a new job
3. IF multiple matching jobs exist for the client with status "NOT_STARTED" or "IN_PROGRESS", THEN THE Job Management System SHALL present a selection dialog to the user showing all matching jobs
4. IF no matching active job exists for the client, THEN THE Job Management System SHALL create a new job as per current behavior
5. WHEN an invoice is linked to an existing job, THE Job Management System SHALL send a notification to the job supervisor indicating the invoice linkage
6. IF all existing jobs for the client have status "COMPLETED", THEN THE Job Management System SHALL create a new job (assuming it's a new project cycle)

### Requirement 4: Repeat Project Handling

**User Story:** As a project manager, I want to easily create repeat projects for the same client, so that I can handle recurring work efficiently.

#### Acceptance Criteria

1. WHEN creating a job for a client that has completed jobs with the same title, THE Job Management System SHALL display a "Repeat Project" indicator
2. WHEN a "Repeat Project" is detected, THE Job Management System SHALL offer to copy settings from the previous completed job (team, supervisor, dates offset)
3. WHEN creating a repeat project, THE Job Management System SHALL automatically append a sequence number or date to distinguish it (e.g., "Website Redesign - Phase 2" or "Website Redesign - 2024")
4. WHEN viewing jobs, THE Job Management System SHALL allow filtering to show all iterations of a repeat project
5. WHEN an invoice is paid for a client with multiple completed jobs of the same title, THE Job Management System SHALL create a new job (not link to completed ones)

### Requirement 6: Invoice-Job Relationship Management

**User Story:** As a project manager, I want to see all invoices associated with a job, so that I can track the financial status of each project.

#### Acceptance Criteria

1. WHEN viewing a job's details, THE Job Management System SHALL display all linked invoices with their payment status
2. WHEN an invoice is linked to a job, THE Job Management System SHALL update the job's financial summary (total billed, paid, pending)
3. WHEN a user manually creates an invoice, THE Job Management System SHALL provide an option to link it to an existing job
4. IF a user links an invoice to a job manually, THEN THE Job Management System SHALL prevent automatic job creation for that invoice
5. WHEN an invoice is unlinked from a job, THE Job Management System SHALL update the job's financial summary accordingly

### Requirement 7: Job Creation Source Tracking

**User Story:** As a system administrator, I want to know how each job was created, so that I can audit the job creation process.

#### Acceptance Criteria

1. WHEN a job is created, THE Job Management System SHALL record the creation source as either "MANUAL" or "AUTO_FROM_INVOICE"
2. WHEN a job is created from an invoice, THE Job Management System SHALL record the originating invoice ID
3. WHEN viewing job details, THE Job Management System SHALL display the creation source and originating invoice (if applicable)
4. WHEN generating reports, THE Job Management System SHALL include job creation source in the data export
5. WHEN filtering jobs, THE Job Management System SHALL allow filtering by creation source

### Requirement 8: Client-Based Job Grouping

**User Story:** As a project manager, I want to see all jobs for a specific client grouped together, so that I can manage client relationships better.

#### Acceptance Criteria

1. WHEN viewing the jobs list, THE Job Management System SHALL provide a "Group by Client" view option
2. WHEN "Group by Client" is enabled, THE Job Management System SHALL display jobs organized by client name
3. WHEN viewing a client group, THE Job Management System SHALL show the total number of jobs, total billed amount, and total paid amount for that client
4. WHEN clicking on a client group, THE Job Management System SHALL expand to show all jobs for that client
5. WHEN creating a new job, THE Job Management System SHALL suggest existing client names from the database

### Requirement 9: Validation and Business Rules

**User Story:** As a project manager, I want the system to enforce business rules during job creation, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN creating a job, THE Job Management System SHALL require title, client name, start date, and team assignment
2. WHEN creating a job, THE Job Management System SHALL validate that the start date is not in the past (with configurable tolerance)
3. IF an end date is provided, THE Job Management System SHALL validate that end date is after start date
4. WHEN creating a job, THE Job Management System SHALL validate that the assigned team exists in the system
5. IF a supervisor is assigned, THE Job Management System SHALL validate that the supervisor exists and is active

### Requirement 10: Conflict Resolution UI

**User Story:** As a project manager, I want clear guidance when potential duplicates are detected, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN a potential duplicate is detected, THE Job Management System SHALL display a comparison view showing the new job data alongside existing job data
2. WHEN viewing the comparison, THE Job Management System SHALL highlight differences between the new and existing job
3. WHEN a duplicate is detected, THE Job Management System SHALL show the existing job's current status, progress, and assigned team
4. WHEN a duplicate is detected, THE Job Management System SHALL provide an option to "Update Existing Job" instead of creating a new one
5. IF the user chooses to update the existing job, THE Job Management System SHALL merge the new data with the existing job and log the update

### Requirement 11: Audit Trail

**User Story:** As a system administrator, I want a complete audit trail of job creation and modification decisions, so that I can track system usage and resolve disputes.

#### Acceptance Criteria

1. WHEN a job is created (manually or automatically), THE Job Management System SHALL log the creation event with timestamp, user, and source
2. WHEN a duplicate warning is shown and dismissed, THE Job Management System SHALL log the user's decision
3. WHEN an invoice is linked to an existing job, THE Job Management System SHALL log the linkage event
4. WHEN a job is updated instead of creating a duplicate, THE Job Management System SHALL log the merge decision
5. WHEN viewing audit logs, THE Job Management System SHALL display all job-related events in chronological order

### Requirement 12: Performance and Scalability

**User Story:** As a system administrator, I want the duplicate detection to be fast and efficient, so that users don't experience delays during job creation.

#### Acceptance Criteria

1. WHEN checking for duplicates, THE Job Management System SHALL complete the check within 500 milliseconds for databases with up to 10,000 jobs
2. WHEN searching for matching jobs, THE Job Management System SHALL use database indexes on client name and job title
3. WHEN multiple users create jobs simultaneously, THE Job Management System SHALL handle concurrent creation without creating duplicates
4. WHEN the duplicate check runs, THE Job Management System SHALL not block other system operations
5. WHEN the system scales beyond 10,000 jobs, THE Job Management System SHALL maintain duplicate check performance through optimized queries
