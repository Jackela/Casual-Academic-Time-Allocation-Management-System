-- Schema evolution for approvals table (complements V2__Create_approvals_table.sql)
-- Convert to ALTERs and "IF NOT EXISTS" to avoid re-creation conflicts

-- Add new columns if not present
ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS action VARCHAR(50);

ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50);

ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS new_status VARCHAR(50);

ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS comment VARCHAR(500);

-- Note: column name "timestamp" is acceptable but reserved as a type; keep as is for compatibility
ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Backfill defaults to satisfy NOT NULL requirements (safe for empty/new tables)
UPDATE approvals SET action = COALESCE(action, 'APPROVE');
UPDATE approvals SET previous_status = COALESCE(previous_status, 'DRAFT');
UPDATE approvals SET new_status = COALESCE(new_status, 'DRAFT');
UPDATE approvals SET timestamp = COALESCE(timestamp, CURRENT_TIMESTAMP);
UPDATE approvals SET is_active = COALESCE(is_active, TRUE);

-- Apply NOT NULL & CHECK constraints idempotently using DO blocks
DO $$ BEGIN
    ALTER TABLE approvals ALTER COLUMN action SET NOT NULL;
    ALTER TABLE approvals ADD CONSTRAINT chk_approvals_action
      CHECK (action IN ('SUBMIT_FOR_APPROVAL', 'APPROVE', 'REJECT', 'REQUEST_MODIFICATION'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE approvals ALTER COLUMN previous_status SET NOT NULL;
    ALTER TABLE approvals ADD CONSTRAINT chk_approvals_previous_status
      CHECK (previous_status IN ('DRAFT','PENDING_LECTURER_APPROVAL','PENDING_TUTOR_REVIEW','TUTOR_APPROVED','MODIFICATION_REQUESTED','PENDING_HR_REVIEW','FINAL_APPROVED','REJECTED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE approvals ALTER COLUMN new_status SET NOT NULL;
    ALTER TABLE approvals ADD CONSTRAINT chk_approvals_new_status
      CHECK (new_status IN ('DRAFT','PENDING_LECTURER_APPROVAL','PENDING_TUTOR_REVIEW','TUTOR_APPROVED','MODIFICATION_REQUESTED','PENDING_HR_REVIEW','FINAL_APPROVED','REJECTED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE approvals ALTER COLUMN timestamp SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE approvals ALTER COLUMN is_active SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- Ensure foreign keys exist (idempotent)
DO $$ BEGIN
    ALTER TABLE approvals ADD CONSTRAINT fk_approval_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE approvals ADD CONSTRAINT fk_approval_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_approval_timesheet ON approvals(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_approval_approver ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_action ON approvals(action);
CREATE INDEX IF NOT EXISTS idx_approval_timestamp ON approvals(timestamp);
CREATE INDEX IF NOT EXISTS idx_approval_timesheet_timestamp ON approvals(timesheet_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_approval_timesheet_timestamp_desc ON approvals(timesheet_id, timestamp DESC);

-- Comments
COMMENT ON TABLE approvals IS 'Tracks all approval actions performed on timesheets throughout the approval workflow';
COMMENT ON COLUMN approvals.timesheet_id IS 'Reference to the timesheet this approval action applies to';
COMMENT ON COLUMN approvals.approver_id IS 'User who performed this approval action';
COMMENT ON COLUMN approvals.action IS 'Type of approval action performed';
COMMENT ON COLUMN approvals.previous_status IS 'Timesheet status before this action';
COMMENT ON COLUMN approvals.new_status IS 'Timesheet status after this action';
COMMENT ON COLUMN approvals.comment IS 'Optional comment explaining the approval action';
COMMENT ON COLUMN approvals.timestamp IS 'When the approval action was performed';
COMMENT ON COLUMN approvals.is_active IS 'Whether this approval action is still active/current';
