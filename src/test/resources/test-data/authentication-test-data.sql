-- Authentication Integration Test Data
-- Provides test data for authentication/authorization scenarios
-- Following SSOT principles and domain-driven patterns

-- Clear existing data (maintaining referential integrity)
DELETE FROM timesheets WHERE id IS NOT NULL;
DELETE FROM courses WHERE id IS NOT NULL;
DELETE FROM users WHERE id IS NOT NULL;

-- Insert test users with DDD-compliant structure
-- Note: Using domain model email structure and proper role separation
INSERT INTO users (email, name, hashed_password, role, is_active, created_at, updated_at) VALUES
('tutor@integration.test', 'Integration Test Tutor', '$2a$12$hashedPasswordForTutor', 'TUTOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('lecturer@integration.test', 'Integration Test Lecturer', '$2a$12$hashedPasswordForLecturer', 'LECTURER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('admin@integration.test', 'Integration Test Admin', '$2a$12$hashedPasswordForAdmin', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert test courses following domain constraints
INSERT INTO courses (code, name, semester, lecturer_id, budget_allocated, budget_used, is_active, created_at, updated_at) 
SELECT 
    'AUTH001', 
    'Authentication Test Course', 
    '2025-S1', 
    u.id, 
    10000.00, 
    0.00, 
    true, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
FROM users u WHERE u.email = 'lecturer@integration.test';

-- Insert test timesheets in various approval states (SSOT compliant)
INSERT INTO timesheets (tutor_id, course_id, week_start_date, hours, hourly_rate, description, status, created_by, created_at, updated_at)
SELECT 
    t.id,
    c.id,
    '2025-08-04',
    8.0,
    45.00,
    'Authentication test timesheet',
    'PENDING_TUTOR_REVIEW',
    t.id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users t, courses c 
WHERE t.email = 'tutor@integration.test' 
  AND c.code = 'AUTH001';