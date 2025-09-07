-- Dashboard Integration Test Data
-- This SQL file provides test data for DashboardControllerIntegrationTest
-- Following Spring Test best practices for @Sql annotation

-- Clear existing data (in reverse order of foreign key dependencies)
DELETE FROM timesheets;
DELETE FROM courses;
DELETE FROM users;

-- Reset auto-increment sequences for H2 database (H2-specific syntax)
-- Note: H2 uses IDENTITY columns by default, sequences might not exist yet

-- Insert test users with known IDs
-- Note: Using direct value insertion for H2 compatibility
INSERT INTO users (id, email_value, name, hashed_password, role, is_active, created_at, updated_at) VALUES
(1, 'tutor@university.edu.au', 'Alice Johnson', 'encodedPassword', 'TUTOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'lecturer@university.edu.au', 'Dr. John Smith', 'encodedPassword', 'LECTURER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'admin@university.edu.au', 'Admin User', 'encodedPassword', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert test courses
INSERT INTO courses (id, code_value, name, semester, lecturer_id, budget_allocated, budget_allocated_currency, budget_used, budget_used_currency, is_active, created_at, updated_at) VALUES
(1, 'COMP1001', 'Introduction to Programming', '2025-S1', 2, 5000.00, 'AUD', 0.00, 'AUD', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'COMP2001', 'Data Structures', '2025-S1', 2, 7000.00, 'AUD', 0.00, 'AUD', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert test timesheets
-- Note: week_start_date should be a Monday, using LocalDate calculation
INSERT INTO timesheets (id, tutor_id, course_id, week_start_date, hours, hourly_rate, hourly_rate_currency, description, status, created_at, updated_at, created_by) VALUES
(1, 1, 1, '2025-08-04', 10.5, 45.00, 'AUD', 'Test timesheet 1', 'PENDING_TUTOR_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
(2, 1, 2, '2025-08-04', 8.0, 45.00, 'AUD', 'Test timesheet 2', 'FINAL_CONFIRMED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);

-- Debug: Show data counts to verify insertion
-- These SELECT statements will be visible in test logs
SELECT 'User count: ' || COUNT(*) as debug_info FROM users;
SELECT 'Course count: ' || COUNT(*) as debug_info FROM courses;
SELECT 'Timesheet count: ' || COUNT(*) as debug_info FROM timesheets;