-- V9__Update_confirmation_workflow_enums.sql
-- Migration to update approval workflow to confirmation workflow
-- This migration transforms the approval-based workflow to confirmation-based workflow

-- Step 1: Drop existing constraints to allow enum value updates
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_previous_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_new_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_action_check;

-- Step 2: Update existing enum values in data to new confirmation workflow
-- Status mapping:
-- PENDING_TUTOR_REVIEW -> PENDING_TUTOR_CONFIRMATION
-- APPROVED_BY_TUTOR -> TUTOR_CONFIRMED
-- APPROVED_BY_LECTURER_AND_TUTOR -> LECTURER_CONFIRMED
-- FINAL_APPROVED -> FINAL_CONFIRMED

DO $$
BEGIN
    -- Log start of migration
    RAISE NOTICE 'Starting approval workflow to confirmation workflow migration...';
    
    -- Update timesheet status values
    UPDATE timesheets SET status = 'PENDING_TUTOR_CONFIRMATION' WHERE status = 'PENDING_TUTOR_REVIEW';
    RAISE NOTICE 'Updated % timesheets from PENDING_TUTOR_REVIEW to PENDING_TUTOR_CONFIRMATION', 
                 (SELECT COUNT(*) FROM timesheets WHERE status = 'PENDING_TUTOR_CONFIRMATION');
    
    UPDATE timesheets SET status = 'TUTOR_CONFIRMED' WHERE status = 'APPROVED_BY_TUTOR';
    RAISE NOTICE 'Updated % timesheets from APPROVED_BY_TUTOR to TUTOR_CONFIRMED',
                 (SELECT COUNT(*) FROM timesheets WHERE status = 'TUTOR_CONFIRMED');
    
    UPDATE timesheets SET status = 'LECTURER_CONFIRMED' WHERE status = 'APPROVED_BY_LECTURER_AND_TUTOR';
    RAISE NOTICE 'Updated % timesheets from APPROVED_BY_LECTURER_AND_TUTOR to LECTURER_CONFIRMED',
                 (SELECT COUNT(*) FROM timesheets WHERE status = 'LECTURER_CONFIRMED');
    
    UPDATE timesheets SET status = 'FINAL_CONFIRMED' WHERE status = 'FINAL_APPROVED';
    RAISE NOTICE 'Updated % timesheets from FINAL_APPROVED to FINAL_CONFIRMED',
                 (SELECT COUNT(*) FROM timesheets WHERE status = 'FINAL_CONFIRMED');
    
    -- Update approval history previous_status values
    UPDATE approvals SET previous_status = 'PENDING_TUTOR_CONFIRMATION' WHERE previous_status = 'PENDING_TUTOR_REVIEW';
    UPDATE approvals SET previous_status = 'TUTOR_CONFIRMED' WHERE previous_status = 'APPROVED_BY_TUTOR';
    UPDATE approvals SET previous_status = 'LECTURER_CONFIRMED' WHERE previous_status = 'APPROVED_BY_LECTURER_AND_TUTOR';
    UPDATE approvals SET previous_status = 'FINAL_CONFIRMED' WHERE previous_status = 'FINAL_APPROVED';
    
    -- Update approval history new_status values
    UPDATE approvals SET new_status = 'PENDING_TUTOR_CONFIRMATION' WHERE new_status = 'PENDING_TUTOR_REVIEW';
    UPDATE approvals SET new_status = 'TUTOR_CONFIRMED' WHERE new_status = 'APPROVED_BY_TUTOR';
    UPDATE approvals SET new_status = 'LECTURER_CONFIRMED' WHERE new_status = 'APPROVED_BY_LECTURER_AND_TUTOR';
    UPDATE approvals SET new_status = 'FINAL_CONFIRMED' WHERE new_status = 'FINAL_APPROVED';
    
    RAISE NOTICE 'Updated approval history status values to confirmation workflow';
END $$;

-- Step 3: Update action enum values
-- Action mapping:
-- APPROVE -> TUTOR_CONFIRM, LECTURER_CONFIRM, or HR_CONFIRM (context dependent)
-- FINAL_APPROVAL -> HR_CONFIRM
-- HR_APPROVE -> HR_CONFIRM

DO $$
BEGIN
    -- Update actions based on context - this is a simplified mapping
    -- In practice, you might need more sophisticated logic based on the workflow state
    
    -- Update generic APPROVE actions to TUTOR_CONFIRM where transitioning to TUTOR_CONFIRMED
    UPDATE approvals SET action = 'TUTOR_CONFIRM' 
    WHERE action = 'APPROVE' AND new_status = 'TUTOR_CONFIRMED';
    
    -- Update generic APPROVE actions to LECTURER_CONFIRM where transitioning to LECTURER_CONFIRMED
    UPDATE approvals SET action = 'LECTURER_CONFIRM' 
    WHERE action = 'APPROVE' AND new_status = 'LECTURER_CONFIRMED';
    
    -- Update FINAL_APPROVAL and HR_APPROVE to HR_CONFIRM
    UPDATE approvals SET action = 'HR_CONFIRM' 
    WHERE action IN ('FINAL_APPROVAL', 'HR_APPROVE');
    
    -- Update any remaining generic APPROVE actions to TUTOR_CONFIRM as default
    -- This handles any edge cases where the context isn't clear
    UPDATE approvals SET action = 'TUTOR_CONFIRM' 
    WHERE action = 'APPROVE';
    
    RAISE NOTICE 'Updated approval actions to confirmation workflow';
END $$;

-- Step 4: Add updated constraints for new confirmation workflow
ALTER TABLE approvals ADD CONSTRAINT approvals_previous_status_check
CHECK (previous_status IN (
    'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_CONFIRMATION',
    'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', 'MODIFICATION_REQUESTED', 
    'PENDING_HR_REVIEW', 'HR_APPROVED', 'FINAL_CONFIRMED', 'REJECTED'
));

ALTER TABLE approvals ADD CONSTRAINT approvals_new_status_check
CHECK (new_status IN (
    'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_CONFIRMATION',
    'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', 'MODIFICATION_REQUESTED',
    'PENDING_HR_REVIEW', 'HR_APPROVED', 'FINAL_CONFIRMED', 'REJECTED'
));

-- Step 5: Add constraint for new confirmation action values
ALTER TABLE approvals ADD CONSTRAINT approvals_action_check
CHECK (action IN (
    'SUBMIT_FOR_APPROVAL', 'TUTOR_CONFIRM', 'LECTURER_CONFIRM', 'HR_CONFIRM',
    'REJECT', 'REQUEST_MODIFICATION'
));

-- Step 6: Add constraint for timesheet status column to match new enum values
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_status_check;
ALTER TABLE timesheets ADD CONSTRAINT timesheets_status_check
CHECK (status IN (
    'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_CONFIRMATION',
    'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', 'MODIFICATION_REQUESTED',
    'PENDING_HR_REVIEW', 'HR_APPROVED', 'FINAL_CONFIRMED', 'REJECTED'
));

-- Step 7: Update indexes for new enum values (performance optimization)
DROP INDEX IF EXISTS idx_approval_enhanced_status;
CREATE INDEX IF NOT EXISTS idx_confirmation_workflow_status
ON approvals(new_status)
WHERE new_status IN ('TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', 'FINAL_CONFIRMED');

CREATE INDEX IF NOT EXISTS idx_timesheet_confirmation_status
ON timesheets(status)
WHERE status IN ('PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED');

-- Step 8: Update table documentation
COMMENT ON CONSTRAINT approvals_previous_status_check ON approvals IS 
'Ensures previous_status contains only valid ApprovalStatus enum values for confirmation workflow';

COMMENT ON CONSTRAINT approvals_new_status_check ON approvals IS
'Ensures new_status contains only valid ApprovalStatus enum values for confirmation workflow';

COMMENT ON CONSTRAINT approvals_action_check ON approvals IS
'Ensures action contains only valid ApprovalAction enum values for confirmation workflow';

COMMENT ON CONSTRAINT timesheets_status_check ON timesheets IS
'Ensures timesheet status contains only valid ApprovalStatus enum values for confirmation workflow';

-- Step 9: Verification and logging
DO $$
DECLARE
    timesheet_count INTEGER;
    approval_count INTEGER;
BEGIN
    -- Count timesheets in new confirmation states
    SELECT COUNT(*) INTO timesheet_count
    FROM timesheets 
    WHERE status IN ('PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', 'FINAL_CONFIRMED');
    
    -- Count approvals with new confirmation actions
    SELECT COUNT(*) INTO approval_count
    FROM approvals
    WHERE action IN ('TUTOR_CONFIRM', 'LECTURER_CONFIRM', 'HR_CONFIRM');
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Timesheets in confirmation workflow states: %', timesheet_count;
    RAISE NOTICE 'Approval records with confirmation actions: %', approval_count;
    RAISE NOTICE 'Updated workflow: DRAFT → PENDING_TUTOR_CONFIRMATION → TUTOR_CONFIRMED → LECTURER_CONFIRMED → FINAL_CONFIRMED';
    RAISE NOTICE 'New actions: TUTOR_CONFIRM, LECTURER_CONFIRM, HR_CONFIRM (replacing generic APPROVE)';
END $$;