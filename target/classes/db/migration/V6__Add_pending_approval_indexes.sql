-- V6: Add indexes for pending approval queries optimization
-- Created for Story 2.1: Implement Lecturer Approval Workflow

-- Index for finding timesheets by status (used for ADMIN pending approval queries)
CREATE INDEX IF NOT EXISTS idx_timesheets_status 
ON timesheets(status);

-- Index for finding timesheets by status and created_at for sorting
CREATE INDEX IF NOT EXISTS idx_timesheets_status_created_at 
ON timesheets(status, created_at);

-- Composite index for joining timesheets with courses by course_id
-- This optimizes the lecturer-specific pending approval query
CREATE INDEX IF NOT EXISTS idx_timesheets_course_id_status 
ON timesheets(course_id, status);

-- Index on courses table for lecturer_id to optimize course-lecturer joins
CREATE INDEX IF NOT EXISTS idx_courses_lecturer_id 
ON courses(lecturer_id);

-- Index for approval history queries by timesheet_id
CREATE INDEX IF NOT EXISTS idx_approvals_timesheet_id_timestamp 
ON approvals(timesheet_id, timestamp);

-- Composite index for finding approvals by status for pending approval statistics
CREATE INDEX IF NOT EXISTS idx_approvals_new_status_timestamp 
ON approvals(new_status, timestamp);

-- Comment explaining the optimization strategy
-- These indexes support the following queries:
-- 1. GET /api/timesheets/pending-approval for LECTURER (course_id + status)
-- 2. GET /api/timesheets/pending-approval for ADMIN (status + created_at sorting)  
-- 3. Approval history queries (timesheet_id + timestamp sorting)
-- 4. Course-lecturer relationship validation (lecturer_id lookups)