-- V9_ROLLBACK__Restore_approval_workflow.sql
-- Rollback migration to restore original approval workflow from confirmation workflow
-- This migration reverses the changes made in V9__Update_confirmation_workflow_enums.sql

-- Step 1: Drop confirmation workflow constraints
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_previous_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_new_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_action_check;
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_status_check;

-- Step 2: Restore original enum values in data
-- Status mapping (reverse):
-- PENDING_TUTOR_CONFIRMATION -> PENDING_TUTOR_REVIEW
-- TUTOR_CONFIRMED -> APPROVED_BY_TUTOR
-- LECTURER_CONFIRMED -> APPROVED_BY_LECTURER_AND_TUTOR
-- FINAL_CONFIRMED -> FINAL_APPROVED

DO $$
BEGIN
    -- Log start of rollback
    RAISE NOTICE 'Starting rollback: confirmation workflow to approval workflow...';
    
    -- Restore timesheet status values
    UPDATE timesheets SET status = 'PENDING_TUTOR_REVIEW' WHERE status = 'PENDING_TUTOR_CONFIRMATION';
    UPDATE timesheets SET status = 'APPROVED_BY_TUTOR' WHERE status = 'TUTOR_CONFIRMED';
    UPDATE timesheets SET status = 'APPROVED_BY_LECTURER_AND_TUTOR' WHERE status = 'LECTURER_CONFIRMED';
    UPDATE timesheets SET status = 'FINAL_APPROVED' WHERE status = 'FINAL_CONFIRMED';
    
    -- Restore approval history previous_status values
    UPDATE approvals SET previous_status = 'PENDING_TUTOR_REVIEW' WHERE previous_status = 'PENDING_TUTOR_CONFIRMATION';
    UPDATE approvals SET previous_status = 'APPROVED_BY_TUTOR' WHERE previous_status = 'TUTOR_CONFIRMED';
    UPDATE approvals SET previous_status = 'APPROVED_BY_LECTURER_AND_TUTOR' WHERE previous_status = 'LECTURER_CONFIRMED';
    UPDATE approvals SET previous_status = 'FINAL_APPROVED' WHERE previous_status = 'FINAL_CONFIRMED';
    
    -- Restore approval history new_status values
    UPDATE approvals SET new_status = 'PENDING_TUTOR_REVIEW' WHERE new_status = 'PENDING_TUTOR_CONFIRMATION';
    UPDATE approvals SET new_status = 'APPROVED_BY_TUTOR' WHERE new_status = 'TUTOR_CONFIRMED';
    UPDATE approvals SET new_status = 'APPROVED_BY_LECTURER_AND_TUTOR' WHERE new_status = 'LECTURER_CONFIRMED';
    UPDATE approvals SET new_status = 'FINAL_APPROVED' WHERE new_status = 'FINAL_CONFIRMED';
    
    RAISE NOTICE 'Restored approval history status values to original approval workflow';
END $$;

-- Step 3: Restore original action enum values
-- Action mapping (reverse):
-- TUTOR_CONFIRM -> APPROVE
-- LECTURER_CONFIRM -> APPROVE  
-- HR_CONFIRM -> FINAL_APPROVAL

DO $$
BEGIN
    -- Restore confirmation actions to original approval actions
    UPDATE approvals SET action = 'APPROVE' WHERE action IN ('TUTOR_CONFIRM', 'LECTURER_CONFIRM');
    UPDATE approvals SET action = 'FINAL_APPROVAL' WHERE action = 'HR_CONFIRM';
    
    RAISE NOTICE 'Restored approval actions to original approval workflow';
END $$;

-- Step 4: Restore original constraints (from V7 migration)
ALTER TABLE approvals ADD CONSTRAINT approvals_previous_status_check
CHECK (previous_status IN (
    'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW',
    'TUTOR_APPROVED', 'APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR',
    'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'HR_APPROVED',
    'FINAL_APPROVED', 'REJECTED'
));

ALTER TABLE approvals ADD CONSTRAINT approvals_new_status_check
CHECK (new_status IN (
    'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW',
    'TUTOR_APPROVED', 'APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR',
    'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'HR_APPROVED',
    'FINAL_APPROVED', 'REJECTED'
));

ALTER TABLE approvals ADD CONSTRAINT approvals_action_check
CHECK (action IN (
    'SUBMIT_FOR_APPROVAL', 'APPROVE', 'REJECT', 'REQUEST_MODIFICATION',
    'FINAL_APPROVAL', 'HR_APPROVE', 'HR_REJECT'
));

-- Step 5: Restore timesheet status constraint
ALTER TABLE timesheets ADD CONSTRAINT timesheets_status_check
CHECK (status IN (
    'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW',
    'TUTOR_APPROVED', 'APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR',
    'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'HR_APPROVED',
    'FINAL_APPROVED', 'REJECTED'
));

-- Step 6: Restore original indexes
DROP INDEX IF EXISTS idx_confirmation_workflow_status;
DROP INDEX IF EXISTS idx_timesheet_confirmation_status;

CREATE INDEX IF NOT EXISTS idx_approval_enhanced_status
ON approvals(new_status)
WHERE new_status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR');

-- Step 7: Restore original table documentation
COMMENT ON CONSTRAINT approvals_previous_status_check ON approvals IS 
'Ensures previous_status contains only valid ApprovalStatus enum values including enhanced workflow states';

COMMENT ON CONSTRAINT approvals_new_status_check ON approvals IS
'Ensures new_status contains only valid ApprovalStatus enum values including enhanced workflow states';

COMMENT ON CONSTRAINT approvals_action_check ON approvals IS
'Ensures action contains only valid ApprovalAction enum values including enhanced workflow actions';

-- Step 8: Verification and logging
DO $$
DECLARE
    timesheet_count INTEGER;
    approval_count INTEGER;
BEGIN
    -- Count timesheets in original approval states
    SELECT COUNT(*) INTO timesheet_count
    FROM timesheets 
    WHERE status IN ('PENDING_TUTOR_REVIEW', 'APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR', 'FINAL_APPROVED');
    
    -- Count approvals with original approval actions
    SELECT COUNT(*) INTO approval_count
    FROM approvals
    WHERE action IN ('APPROVE', 'FINAL_APPROVAL', 'HR_APPROVE');
    
    RAISE NOTICE 'Rollback completed successfully!';
    RAISE NOTICE 'Timesheets in original approval workflow states: %', timesheet_count;
    RAISE NOTICE 'Approval records with original approval actions: %', approval_count;
    RAISE NOTICE 'Restored workflow: DRAFT → PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR → APPROVED_BY_LECTURER_AND_TUTOR → FINAL_APPROVED';
    RAISE NOTICE 'Restored actions: APPROVE, FINAL_APPROVAL, HR_APPROVE';
END $$;