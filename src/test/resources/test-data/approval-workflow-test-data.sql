-- Approval Workflow Integration Test Data
-- Provides comprehensive test data for approval state machine scenarios
-- Following SSOT approval workflow states and transitions

-- Clear existing data (maintaining referential integrity)
DELETE FROM timesheets WHERE id IS NOT NULL;
DELETE FROM courses WHERE id IS NOT NULL;
DELETE FROM users WHERE id IS NOT NULL;

-- Insert test users for approval workflow scenarios
INSERT INTO users (email, name, hashed_password, role, is_active, created_at, updated_at) VALUES
('workflow.tutor@integration.test', 'Workflow Test Tutor', '$2a$12$workflowTutorPassword', 'TUTOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('workflow.lecturer@integration.test', 'Workflow Test Lecturer', '$2a$12$workflowLecturerPassword', 'LECTURER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('workflow.admin@integration.test', 'Workflow Test Admin', '$2a$12$workflowAdminPassword', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert test course for approval workflow
INSERT INTO courses (code, name, semester, lecturer_id, budget_allocated, budget_used, is_active, created_at, updated_at)
SELECT 
    'WORKFLOW01',
    'Approval Workflow Test Course',
    '2025-S1',
    u.id,
    15000.00,
    0.00,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u WHERE u.email = 'workflow.lecturer@integration.test';

-- Insert timesheets in various approval states for comprehensive testing
-- State 1: DRAFT (initial state)
INSERT INTO timesheets (tutor_id, course_id, week_start_date, hours, hourly_rate, description, status, created_by, created_at, updated_at)
SELECT 
    t.id, c.id, '2025-08-04', 5.0, 45.00, 'Draft timesheet for workflow testing', 'DRAFT', t.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users t, courses c 
WHERE t.email = 'workflow.tutor@integration.test' AND c.code = 'WORKFLOW01';

-- State 2: PENDING_TUTOR_CONFIRMATION (submitted by tutor)
INSERT INTO timesheets (tutor_id, course_id, week_start_date, hours, hourly_rate, description, status, created_by, created_at, updated_at)
SELECT 
    t.id, c.id, '2025-07-28', 8.0, 45.00, 'Submitted timesheet awaiting tutor confirmation', 'PENDING_TUTOR_CONFIRMATION', t.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users t, courses c 
WHERE t.email = 'workflow.tutor@integration.test' AND c.code = 'WORKFLOW01';

-- State 3: TUTOR_CONFIRMED (tutor confirmed, awaiting lecturer)
INSERT INTO timesheets (tutor_id, course_id, week_start_date, hours, hourly_rate, description, status, created_by, created_at, updated_at)
SELECT 
    t.id, c.id, '2025-07-21', 10.0, 45.00, 'Tutor confirmed, awaiting lecturer confirmation', 'TUTOR_CONFIRMED', t.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users t, courses c 
WHERE t.email = 'workflow.tutor@integration.test' AND c.code = 'WORKFLOW01';

-- State 4: FINAL_CONFIRMED (complete confirmation chain)
INSERT INTO timesheets (tutor_id, course_id, week_start_date, hours, hourly_rate, description, status, created_by, created_at, updated_at)
SELECT 
    t.id, c.id, '2025-07-14', 12.0, 45.00, 'Fully confirmed timesheet', 'FINAL_CONFIRMED', t.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users t, courses c 
WHERE t.email = 'workflow.tutor@integration.test' AND c.code = 'WORKFLOW01';

-- State 5: REJECTED (for testing rejection scenarios)
INSERT INTO timesheets (tutor_id, course_id, week_start_date, hours, hourly_rate, description, status, created_by, created_at, updated_at)
SELECT 
    t.id, c.id, '2025-07-07', 6.0, 45.00, 'Rejected timesheet for workflow testing', 'REJECTED', t.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users t, courses c 
WHERE t.email = 'workflow.tutor@integration.test' AND c.code = 'WORKFLOW01';