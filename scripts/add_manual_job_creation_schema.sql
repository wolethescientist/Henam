-- Manual Job Creation Schema Changes
-- This script adds the necessary database changes for manual job creation with duplicate prevention
-- Run this script directly on your PostgreSQL database if you're not using Alembic migrations

-- Step 1: Create new enum types
CREATE TYPE jobcreationsource AS ENUM ('MANUAL', 'AUTO_FROM_INVOICE');
CREATE TYPE jobauditeventtype AS ENUM ('JOB_CREATED', 'DUPLICATE_WARNING_SHOWN', 'DUPLICATE_OVERRIDE', 'INVOICE_LINKED', 'JOB_UPDATED', 'JOB_MERGED');

-- Step 2: Add new columns to jobs table
ALTER TABLE jobs ADD COLUMN creation_source jobcreationsource NOT NULL DEFAULT 'MANUAL';
ALTER TABLE jobs ADD COLUMN originating_invoice_id INTEGER;
ALTER TABLE jobs ADD COLUMN duplicate_override BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN duplicate_justification TEXT;

-- Step 3: Add foreign key constraint for originating_invoice_id
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_originating_invoice 
    FOREIGN KEY (originating_invoice_id) REFERENCES invoices(id);

-- Step 4: Create indexes for new job fields
CREATE INDEX ix_jobs_creation_source ON jobs(creation_source);
CREATE INDEX ix_jobs_originating_invoice_id ON jobs(originating_invoice_id);
CREATE INDEX ix_jobs_duplicate_override ON jobs(duplicate_override);

-- Step 5: Create indexes for duplicate detection (case-insensitive)
CREATE INDEX ix_jobs_client_lower ON jobs(LOWER(client));
CREATE INDEX ix_jobs_title_lower ON jobs(LOWER(title));
CREATE INDEX ix_jobs_client_title_status ON jobs(client, title, status);
CREATE INDEX ix_jobs_client_status ON jobs(client, status);

-- Step 6: Create job_audit_logs table
CREATE TABLE job_audit_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id),
    event_type jobauditeventtype NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    event_data TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create indexes for job_audit_logs
CREATE INDEX ix_job_audit_logs_id ON job_audit_logs(id);
CREATE INDEX ix_job_audit_logs_job_id ON job_audit_logs(job_id);
CREATE INDEX ix_job_audit_logs_event_type ON job_audit_logs(event_type);
CREATE INDEX ix_job_audit_logs_user_id ON job_audit_logs(user_id);
CREATE INDEX ix_job_audit_logs_timestamp ON job_audit_logs(timestamp);
CREATE INDEX ix_job_audit_logs_job_timestamp ON job_audit_logs(job_id, timestamp);
CREATE INDEX ix_job_audit_logs_user_timestamp ON job_audit_logs(user_id, timestamp);

-- Verification queries
-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'jobs' 
AND column_name IN ('creation_source', 'originating_invoice_id', 'duplicate_override', 'duplicate_justification');

-- Check if job_audit_logs table was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'job_audit_logs'
ORDER BY ordinal_position;

-- Check if indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('jobs', 'job_audit_logs')
AND indexname LIKE '%creation_source%' 
   OR indexname LIKE '%duplicate%' 
   OR indexname LIKE '%audit%'
   OR indexname LIKE '%client_lower%'
   OR indexname LIKE '%title_lower%';
