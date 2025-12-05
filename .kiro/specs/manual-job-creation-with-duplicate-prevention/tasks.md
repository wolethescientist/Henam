# Implementation Plan: Manual Job Creation with Duplicate Prevention

## Task Overview

This implementation plan breaks down the feature into discrete, manageable coding tasks. Each task builds incrementally on previous tasks, ensuring no orphaned code.

---

## Phase 1: Database Schema and Models

- [x] 1. Update database schema and models




  - Add `JobCreationSource` enum to models
  - Add new fields to Job model (`creation_source`, `originating_invoice_id`, `duplicate_override`, `duplicate_justification`)
  - Create `JobAuditEventType` enum
  - Create `JobAuditLog` model with relationships
  - Add database indexes for performance
  - _Requirements: 5, 7, 11, 12_

- [x] 1.1 Create database migration script



  - Write Alembic migration for new Job fields
  - Write Alembic migration for JobAuditLog table
  - Write migration for new indexes
  - Include rollback logic
  - _Requirements: 5, 12_

- [x] 1.2 Create data backfill script


  - Backfill `creation_source` for existing jobs (set to AUTO_FROM_INVOICE)
  - Set `duplicate_override` to False for all existing jobs
  - Verify data integrity after backfill
  - _Requirements: 5_

---

## Phase 2: Backend Services

- [x] 2. Implement Job Duplicate Detection Service






  - Create `app/services/job_duplicate_service.py`
  - Implement `check_for_duplicates()` method with fuzzy matching
  - Implement `find_matching_jobs_for_invoice()` method
  - Implement `calculate_title_similarity()` using fuzzy matching library
  - Add database query optimization with proper indexes
  - _Requirements: 2, 3, 12_


- [x] 2.1 Implement duplicate detection query optimization

  - Write optimized SQL query for client + title matching
  - Add case-insensitive matching
  - Filter by status (NOT_STARTED, IN_PROGRESS only)
  - Add query performance logging
  - _Requirements: 2, 12_


- [x] 3. Implement Job Creation Service



















- [ ] 3. Implement Job Creation Service

  - Create `app/services/job_creation_service.py`
  - Implement `create_job_manual()` method with duplicate checking
  - Implement `create_job_from_invoice()` method with smart linking
  - Implement `link_invoice_to_job()` method
  - Add transaction handling and rollback logic
  - _Requirements: 1, 3, 5, 6_


- [x] 3.1 Add job creation validation logic

  - Validate required fields (title, client, start_date, team_id)
  - Validate date ranges (start_date not in past, end_date after start_date)
  - Validate team and supervisor existence
  - Return clear validation error messages
  - _Requirements: 9_



- [x] 4. Implement Job Audit Service





  - Create `app/services/job_audit_service.py`
  - Implement `log_job_creation()` method
  - Implement `log_duplicate_decision()` method
  - Implement `log_invoice_linking()` method
  - Add helper method to format audit log entries for display
  - _Requirements: 11_



---

## Phase 3: API Endpoints

- [x] 5. Create duplicate check API endpoint







  - Add POST `/jobs/check-duplicates` endpoint in `app/routers/jobs.py`
  - Integrate with JobDuplicateService
  - Return matching jobs and repeat project info
  - Add request/response schemas to `app/schemas.py`
  - Add error handling
  - _Requirements: 2, 4_

- [x] 5.1 Create client listing API endpoint




  - Add GET `/jobs/clients` endpoint
  - Return unique clients with job counts and financial summary
  - Optimize query for performance
  - Add caching (5 minute TTL)
  - _Requirements: 8_

- [x] 5.2 Create jobs-by-client API endpoint


  - Add GET `/jobs/by-client/{client_name}` endpoint
  - Return all jobs for specific client
  - Add optional `include_completed` parameter
  - Add pagination support
  - _Requirements: 8_


- [x] 5.3 Create audit log API endpoint

  - Add GET `/jobs/{job_id}/audit-log` endpoint
  - Return formatted audit trail for job
  - Add pagination for large audit logs
  - _Requirements: 11_
-

- [x] 6. Update job creation API endpoint




  - Modify POST `/jobs/` endpoint to use JobCreationService
  - Add `skip_duplicate_check` parameter
  - Add `duplicate_justification` parameter
  - Update to set `creation_source` to MANUAL
  - Add duplicate check before creation (unless skipped)
  - Update response to include creation source info
  - _Requirements: 1, 2, 5_

- [x] 6.1 Add validation to job creation endpoint


  - Validate justification is provided when skipping duplicate check
  - Validate all required fields present
  - Return 400 errors for validation failures
  - _Requirements: 1, 9_



- [x] 7. Update invoice payment flow for smart linking





  - Modify invoice payment endpoint in `app/routers/invoices.py`
  - Integrate with JobDuplicateService to find matching jobs
  - If single match found, link invoice to job
  - If multiple matches, return list for user selection
  - If no match, create new job as before
  - Update to set `creation_source` to AUTO_FROM_INVOICE
  - _Requirements: 3, 5, 6_

- [x] 7.1 Create invoice-to-job linking endpoint


  - Add POST `/invoices/{invoice_id}/link-to-job` endpoint
  - Accept job_id parameter
  - Link invoice to specified job
  - Update job financial summary
  - Send notifications
  - _Requirements: 3, 6_



---

## Phase 4: Frontend - Core Components

- [x] 8. Create Job Creation Modal component





  - Create `henam-frontend/src/components/jobs/CreateJobModal.tsx`
  - Build form with fields: title, client, start_date, end_date, team_id, supervisor_id
  - Add client name autocomplete using `/jobs/clients` endpoint
  - Add team and supervisor dropdowns
  - Add date pickers with validation
  - Integrate with duplicate check API before submission
  - _Requirements: 1, 8, 9_

- [x] 8.1 Add form validation to Create Job Modal


  - Validate required fields
  - Validate date ranges (start before end, not in past)
  - Show inline validation errors
  - Disable submit until form is valid
  - _Requirements: 1, 9_



- [x] 8.2 Integrate duplicate check in Create Job Modal










  - Call `/jobs/check-duplicates` API when form is filled
  - Show loading state during check
  - If duplicates found, show DuplicateWarningDialog
  - If no duplicates, proceed with creation
  - Handle API errors gracefully
  - _Requirements: 2_

- [x] 9. Create Duplicate Warning Dialog component





  - Create `henam-frontend/src/components/jobs/DuplicateWarningDialog.tsx`
  - Display side-by-side comparison of new vs existing job data
  - Highlight differences between jobs
  - Show existing job status, progress, team, supervisor
  - Add action buttons: "View Existing", "Create Anyway", "Cancel"
  - Add optional justification text field for "Create Anyway"
  - _Requirements: 2, 10_

- [x] 9.1 Add repeat project indicator to Duplicate Warning Dialog

  - Check if `is_repeat_project` is true in duplicate check result
  - Show "Repeat Project" badge
  - Offer to copy settings from previous completed job
  - Suggest appending sequence number or date to title
  - _Requirements: 4_

- [x] 10. Create Job Selection Dialog for invoices





  - Create `henam-frontend/src/components/invoices/JobSelectionDialog.tsx`
  - Display list of matching active jobs when invoice is paid
  - Show job details preview (title, status, progress, team)
  - Add search/filter functionality
  - Add "Create New Job Instead" option
  - Handle job selection and linking
  - _Requirements: 3_

- [x] 11. Create Client Grouped View component





  - Create `henam-frontend/src/components/jobs/ClientGroupedView.tsx`
  - Display jobs organized by client in accordion style
  - Show client summary (job count, total billed, paid, pending)
  - Make expandable to show all jobs for client
  - Add quick actions per client
  - _Requirements: 8_

---

## Phase 5: Frontend - Integration

- [x] 12. Update Jobs Page with Create Job button





  - Add "Create Job" button to `henam-frontend/src/pages/jobs/OptimizedJobsPage.tsx`
  - Wire up button to open CreateJobModal
  - Handle successful job creation (refresh list, show toast)
  - Add view mode toggle: "List View" vs "Client Grouped View"
  - _Requirements: 1, 8_

- [x] 12.1 Add job creation source indicator to Jobs Page


  - Display badge showing if job was created manually or from invoice
  - Add filter to show only manual or only auto-created jobs
  - Update job details view to show creation source
  - _Requirements: 7_

- [x] 13. Update Invoice Payment flow





  - Modify invoice payment component to handle smart linking
  - Show JobSelectionDialog when multiple matches found
  - Auto-link when single match found (show toast notification)
  - Create new job when no matches found (existing behavior)
  - _Requirements: 3_

- [x] 14. Add job audit log viewer





  - Create audit log tab/section in job details view
  - Display audit events in timeline format
  - Show user, timestamp, event type, and description
  - Add filtering by event type
  - Add pagination for large audit logs
  - _Requirements: 11_

---

## Phase 6: API Integration and State Management

- [x] 15. Update RTK Query API definitions





  - Add `checkJobDuplicates` mutation to `henam-frontend/src/store/api/jobsApi.ts`
  - Add `getClients` query
  - Add `getJobsByClient` query
  - Add `getJobAuditLog` query
  - Add `linkInvoiceToJob` mutation
  - Update `createJob` mutation to accept new parameters
  - _Requirements: 1, 2, 3, 8, 11_

- [x] 15.1 Add cache invalidation for new endpoints

  - Invalidate job cache after manual creation
  - Invalidate client cache after job creation
  - Invalidate invoice cache after linking
  - Add optimistic updates for better UX
  - _Requirements: 1, 3_

---

## Phase 7: Notifications and User Feedback

- [x] 16. Add notifications for job creation events





  - Send notification when job is manually created
  - Send notification when invoice is linked to existing job
  - Send notification to supervisor when job is assigned
  - Update notification service to handle new event types
  - _Requirements: 1, 6_

- [x] 16.1 Add email notifications for job events


  - Send email when job is manually created (to supervisor)
  - Send email when invoice is linked to job (to supervisor)
  - Use existing email service infrastructure
  - _Requirements: 1, 6_

- [x] 17. Add toast notifications for user actions










  - Show success toast after job created
  - Show success toast after invoice linked
  - Show warning toast when duplicate detected
  - Show error toast on API failures
  - _Requirements: 1, 3_

---

## Phase 8: Documentation and Deployment
-

- [x] 18. Update API documentation




  - Document new endpoints in OpenAPI/Swagger
  - Add request/response examples
  - Document error codes and messages
  - Add usage examples
  - _Requirements: All_


- [x] 18.1 Create user documentation

  - Write guide for manual job creation
  - Write guide for handling duplicate warnings
  - Write guide for client grouped view
  - Add screenshots and examples
  - _Requirements: 1, 2, 8_

- [ ] 19. Create deployment checklist
  - Database migration steps
  - Data backfill steps
  - Feature flag configuration (if using)
  - Rollback procedures
  - Monitoring setup
  - _Requirements: All_

- [ ] 19.1 Set up monitoring and alerts
  - Add metrics for job creation (manual vs auto)
  - Add metrics for duplicate detection performance
  - Add metrics for duplicate override rate
  - Set up alerts for performance degradation
  - Set up alerts for high error rates
  - _Requirements: 12_

---

## Phase 9: Final Integration and Launch

- [ ] 20. Perform integration testing in staging
  - Test all flows end-to-end in staging environment
  - Test with production-like data volumes
  - Verify performance meets requirements
  - Test rollback procedures
  - _Requirements: All_

- [ ] 20.1 Conduct user acceptance testing
  - Have stakeholders test manual job creation
  - Have stakeholders test duplicate handling
  - Gather feedback on UX
  - Make adjustments based on feedback
  - _Requirements: All_

- [ ] 21. Deploy to production
  - Run database migrations
  - Run data backfill scripts
  - Deploy backend services
  - Deploy frontend changes
  - Verify deployment success
  - Monitor for issues
  - _Requirements: All_

- [ ] 21.1 Post-deployment verification
  - Verify manual job creation works
  - Verify duplicate detection works
  - Verify invoice linking works
  - Check monitoring dashboards
  - Verify no errors in logs
  - _Requirements: All_

---

## Notes

- Each task should be completed before moving to the next
- Database migrations should be tested in staging before production
- Keep stakeholders informed of progress after each phase
- Monitor performance metrics closely after deployment
