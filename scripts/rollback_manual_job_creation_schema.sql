-- Rollback Script for Manual Job Creation Schema Changes
-- This script reverses all changes made by add_manual_job_creation_schema.sql
-- Run this script directly on your PostgreSQL database to undo the changes

-- IMPORTANT: This will permanently delete data from job_audit_logs table and remove columns from jobs table
-- Make sure to backup your database before running this script!

-- Step 1: Drop indexes for job_audit_logs
DROP INDEX IF EXISTS ix_job_audit_logs_user_timestamp;
DROP INDEX IF EXISTS ix_job_audit_logs_job_timestamp;
DROP INDEX IF EXISTS ix_job_audit_logs_timestamp;
DROP INDEX IF EXISTS ix_job_audit_logs_user_id;
DROP INDEX IF EXISTS ix_job_audit_logs_event_type;
DROP INDEX IF EXISTS ix_job_audit_logs_job_id;
DROP INDEX IF EXISTS ix_job_audit_logs_id;

-- Step 2: Drop job_audit_logs table
DROP TABLE IF EXISTS job_audit_logs;

-- Step 3: Drop indexes for duplicate detection
DROP INDEX IF EXISTS ix_jobs_client_status;
DROP INDEX IF EXISTS ix_jobs_client_title_status;
DROP INDEX IF EXISTS ix_jobs_title_lower;
DROP INDEX IF EXISTS ix_jobs_client_lower;

-- Step 4: Drop indexes for new job fields
DROP INDEX IF EXISTS ix_jobs_duplicate_override;
DROP INDEX IF EXISTS ix_jobs_originating_invoice_id;
DROP INDEX IF EXISTS ix_jobs_creation_source;

-- Step 5: Drop foreign key constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS fk_jobs_originating_invoice;

-- Step 6: Drop new columns from jobs table
ALTER TABLE jobs DROP COLUMN IF EXISTS duplicate_justification;
ALTER TABLE jobs DROP COLUMN IF EXISTS duplicate_override;
ALTER TABLE jobs DROP COLUMN IF EXISTS originating_invoice_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS creation_source;

-- Step 7: Drop enum types
DROP TYPE IF EXISTS jobauditeventtype;
DROP TYPE IF EXISTS jobcreationsource;

-- Verification queries
-- Check if columns were removed successfully
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs' 
AND column_name IN ('creation_source', 'originating_invoice_id', 'duplicate_override', 'duplicate_justification');
-- Should return 0 rows

-- Check if job_audit_logs table was dropped
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'job_audit_logs';
-- Should return 0 rows

-- Check if enum types were dropped
SELECT typname
FROM pg_type
WHERE typname IN ('jobcreationsource', 'jobauditeventtype');
-- Should return 0 rows

