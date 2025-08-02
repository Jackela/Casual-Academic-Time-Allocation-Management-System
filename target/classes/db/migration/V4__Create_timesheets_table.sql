-- Create timesheets table
-- Migration V4: Add timesheets table for time tracking and approval workflow
-- Created: 2025-08-01

CREATE TABLE timesheets (
    id BIGSERIAL PRIMARY KEY,
    tutor_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    week_start_date DATE NOT NULL,
    hours DECIMAL(3,1) NOT NULL CHECK (hours >= 0.1 AND hours <= 40.0),
    hourly_rate DECIMAL(5,2) NOT NULL CHECK (hourly_rate >= 10.00 AND hourly_rate <= 200.00),
    description TEXT NOT NULL CHECK (LENGTH(description) <= 1000),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_timesheets_tutor FOREIGN KEY (tutor_id) REFERENCES users(id),
    CONSTRAINT fk_timesheets_course FOREIGN KEY (course_id) REFERENCES courses(id),
    CONSTRAINT fk_timesheets_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Business rules
    CONSTRAINT chk_timesheets_status CHECK (status IN (
        'draft', 
        'pending_tutor_review', 
        'tutor_approved', 
        'modification_requested',
        'pending_hr_review', 
        'final_approved', 
        'rejected'
    )),
    
    -- Ensure week_start_date is a Monday (day of week = 1)
    CONSTRAINT chk_timesheets_monday CHECK (EXTRACT(DOW FROM week_start_date) = 1),
    
    -- Unique constraint: one timesheet per tutor per course per week
    CONSTRAINT uk_timesheet_tutor_course_week UNIQUE (tutor_id, course_id, week_start_date)
);

-- Create indexes for performance optimization
CREATE INDEX idx_timesheet_tutor ON timesheets(tutor_id);
CREATE INDEX idx_timesheet_course ON timesheets(course_id);
CREATE INDEX idx_timesheet_week_start ON timesheets(week_start_date);
CREATE INDEX idx_timesheet_status ON timesheets(status);
CREATE INDEX idx_timesheet_created_by ON timesheets(created_by);
CREATE INDEX idx_timesheet_created_at ON timesheets(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_timesheet_tutor_status ON timesheets(tutor_id, status);
CREATE INDEX idx_timesheet_course_status ON timesheets(course_id, status);
CREATE INDEX idx_timesheet_status_created_at ON timesheets(status, created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timesheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_timesheets_updated_at
    BEFORE UPDATE ON timesheets
    FOR EACH ROW
    EXECUTE FUNCTION update_timesheets_updated_at();

-- Create function to validate Monday constraint
CREATE OR REPLACE FUNCTION validate_timesheet_monday()
RETURNS TRIGGER AS $$
BEGIN
    IF EXTRACT(DOW FROM NEW.week_start_date) != 1 THEN
        RAISE EXCEPTION 'Week start date must be a Monday';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_timesheets_validate_monday
    BEFORE INSERT OR UPDATE ON timesheets
    FOR EACH ROW
    EXECUTE FUNCTION validate_timesheet_monday();

-- Add comments for documentation
COMMENT ON TABLE timesheets IS 'Timesheet records for casual academic staff with approval workflow';
COMMENT ON COLUMN timesheets.tutor_id IS 'ID of the tutor whose time is being recorded';
COMMENT ON COLUMN timesheets.course_id IS 'ID of the course for which work was performed';
COMMENT ON COLUMN timesheets.week_start_date IS 'Start date of the work week (must be Monday)';
COMMENT ON COLUMN timesheets.hours IS 'Number of hours worked (0.1 to 40.0)';
COMMENT ON COLUMN timesheets.hourly_rate IS 'Hourly rate for the work (10.00 to 200.00)';
COMMENT ON COLUMN timesheets.description IS 'Description of work performed (max 1000 characters)';
COMMENT ON COLUMN timesheets.status IS 'Current approval status in the workflow';
COMMENT ON COLUMN timesheets.created_by IS 'ID of the user who created this timesheet record (typically a lecturer)';