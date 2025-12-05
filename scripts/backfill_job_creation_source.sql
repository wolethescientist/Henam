-- Backfill script for job creation source fields
-- This script sets creation_source to AUTO_FROM_INVOICE for all existing jobs
-- and sets duplicate_override to False for all existing jobs.

-- Start transaction
BEGIN;

-- Step 1: Backfill creation_source for existing jobs
-- Set all existing jobs to AUTO_FROM_INVOICE (assuming they were created from invoices)
UPDATE jobs
SET creation_source = 'AUTO_FROM_INVOICE'
WHERE creation_source IS NULL OR creation_source = 'MANUAL';

-- Step 2: Backfill duplicate_override for existing jobs
-- Set all existing jobs to FALSE (no duplicate override)
UPDATE jobs
SET duplicate_override = FALSE
WHERE duplicate_override IS NULL;

-- Step 3: Verify the updates
-- Check for any jobs with NULL creation_source
SELECT 'Jobs with NULL creation_source:' AS check_name, COUNT(*) AS count
FROM jobs
WHERE creation_source IS NULL;

-- Check for any jobs with NULL duplicate_override
SELECT 'Jobs with NULL duplicate_override:' AS check_name, COUNT(*) AS count
FROM jobs
WHERE duplicate_override IS NULL;

-- Show distribution of creation_source
SELECT 'Creation source distribution:' AS info;
SELECT creation_source, COUNT(*) AS count
FROM jobs
GROUP BY creation_source
ORDER BY creation_source;

-- Show count of jobs with duplicate_override = TRUE
SELECT 'Jobs with duplicate_override = TRUE:' AS check_name, COUNT(*) AS count
FROM jobs
WHERE duplicate_override = TRUE;

-- Show total job count
SELECT 'Total jobs:' AS info, COUNT(*) AS count
FROM jobs;

-- Commit the transaction
COMMIT;

-- If you want to rollback instead, uncomment the line below and comment out COMMIT above
-- ROLLBACK;
