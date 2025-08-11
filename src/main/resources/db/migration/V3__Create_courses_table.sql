CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  lecturer_id BIGINT NOT NULL REFERENCES users(id)
);

-- Create courses table
-- Migration V3: Add courses table for timesheet management
-- Created: 2025-08-01

CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    lecturer_id BIGINT NOT NULL,
    budget_allocated DECIMAL(12,2) NOT NULL CHECK (budget_allocated >= 0),
    budget_used DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (budget_used >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint to users table
    CONSTRAINT fk_courses_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id),
    
    -- Business rule: budget_used cannot exceed budget_allocated
    CONSTRAINT chk_courses_budget_usage CHECK (budget_used <= budget_allocated)
);

-- Create indexes for performance
CREATE INDEX idx_course_code ON courses(code);
CREATE INDEX idx_course_lecturer ON courses(lecturer_id);
CREATE INDEX idx_course_semester ON courses(semester);
CREATE INDEX idx_course_active ON courses(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Course information including budget management for timesheet tracking';
COMMENT ON COLUMN courses.code IS 'Unique course code identifier (e.g., COMP5349)';
COMMENT ON COLUMN courses.name IS 'Full course name';
COMMENT ON COLUMN courses.semester IS 'Semester identifier (e.g., 2025S1)';
COMMENT ON COLUMN courses.lecturer_id IS 'ID of the lecturer responsible for this course';
COMMENT ON COLUMN courses.budget_allocated IS 'Total budget allocated for casual staff hours';
COMMENT ON COLUMN courses.budget_used IS 'Amount of budget already used for approved timesheets';
COMMENT ON COLUMN courses.is_active IS 'Whether the course is currently active for timesheet creation';