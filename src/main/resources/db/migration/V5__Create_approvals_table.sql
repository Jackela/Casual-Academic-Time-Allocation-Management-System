-- Create approvals table for tracking timesheet approval workflow
-- V5__Create_approvals_table.sql

CREATE TABLE approvals (
    id BIGSERIAL PRIMARY KEY,
    timesheet_id BIGINT NOT NULL,
    approver_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('SUBMIT_FOR_APPROVAL', 'APPROVE', 'REJECT', 'REQUEST_MODIFICATION')),
    previous_status VARCHAR(50) NOT NULL CHECK (previous_status IN (
        'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW', 'TUTOR_APPROVED', 
        'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'FINAL_APPROVED', 'REJECTED'
    )),
    new_status VARCHAR(50) NOT NULL CHECK (new_status IN (
        'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW', 'TUTOR_APPROVED', 
        'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'FINAL_APPROVED', 'REJECTED'
    )),
    comment VARCHAR(500),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Foreign key constraints
    CONSTRAINT fk_approval_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_approval_timesheet ON approvals(timesheet_id);
CREATE INDEX idx_approval_approver ON approvals(approver_id);
CREATE INDEX idx_approval_action ON approvals(action);
CREATE INDEX idx_approval_timestamp ON approvals(timestamp);
CREATE INDEX idx_approval_timesheet_timestamp ON approvals(timesheet_id, timestamp);

-- Create index for finding current status efficiently
CREATE INDEX idx_approval_timesheet_timestamp_desc ON approvals(timesheet_id, timestamp DESC);

-- Add comment for documentation
COMMENT ON TABLE approvals IS 'Tracks all approval actions performed on timesheets throughout the approval workflow';
COMMENT ON COLUMN approvals.timesheet_id IS 'Reference to the timesheet this approval action applies to';
COMMENT ON COLUMN approvals.approver_id IS 'User who performed this approval action';
COMMENT ON COLUMN approvals.action IS 'Type of approval action performed';
COMMENT ON COLUMN approvals.previous_status IS 'Timesheet status before this action';
COMMENT ON COLUMN approvals.new_status IS 'Timesheet status after this action';
COMMENT ON COLUMN approvals.comment IS 'Optional comment explaining the approval action';
COMMENT ON COLUMN approvals.timestamp IS 'When the approval action was performed';
COMMENT ON COLUMN approvals.is_active IS 'Whether this approval action is still active/current';