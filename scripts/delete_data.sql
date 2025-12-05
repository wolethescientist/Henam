-- SQL Script to Delete All Data from notifications, invoices, expenses, and jobs tables
-- WARNING: This will permanently delete all data from these tables!
-- Make sure to backup your database before running this script.

-- Disable foreign key checks temporarily (if using MySQL)
-- SET FOREIGN_KEY_CHECKS = 0;

-- For PostgreSQL, you can use CASCADE or delete in the correct order
-- This script deletes in the correct order to respect foreign key constraints

-- ============================================
-- Step 1: Delete all notifications
-- ============================================
DELETE FROM notifications;

-- ============================================
-- Step 2: Delete all tasks (related to jobs)
-- ============================================
-- Tasks have foreign key to jobs, so delete them first
DELETE FROM tasks WHERE job_id IS NOT NULL;

-- ============================================
-- Step 3: Delete all invoices
-- ============================================
-- Invoices have foreign keys to jobs (job_id and converted_job_id)
DELETE FROM invoices;

-- ============================================
-- Step 4: Delete all expenses
-- ============================================
DELETE FROM expenses;

-- ============================================
-- Step 5: Delete all jobs
-- ============================================
-- Jobs can now be safely deleted after tasks and invoices are removed
DELETE FROM jobs;

-- Re-enable foreign key checks (if using MySQL)
-- SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- Verify deletion (optional)
-- ============================================
-- SELECT COUNT(*) as notifications_count FROM notifications;
-- SELECT COUNT(*) as invoices_count FROM invoices;
-- SELECT COUNT(*) as expenses_count FROM expenses;
-- SELECT COUNT(*) as jobs_count FROM jobs;
-- SELECT COUNT(*) as tasks_count FROM tasks WHERE job_id IS NOT NULL;

-- ============================================
-- Reset auto-increment counters (optional)
-- ============================================
-- For PostgreSQL:
-- ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
-- ALTER SEQUENCE invoices_id_seq RESTART WITH 1;
-- ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
-- ALTER SEQUENCE jobs_id_seq RESTART WITH 1;

-- For MySQL:
-- ALTER TABLE notifications AUTO_INCREMENT = 1;
-- ALTER TABLE invoices AUTO_INCREMENT = 1;
-- ALTER TABLE expenses AUTO_INCREMENT = 1;
-- ALTER TABLE jobs AUTO_INCREMENT = 1;
