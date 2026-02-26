-- V7_ROLLBACK__Restore_original_constraints.sql
-- Rollback script to restore original V5 constraints if migration needs to be reverted
-- This script should be run manually if V7 migration needs to be rolled back

-- Step 1: Drop enhanced constraints
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_previous_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_new_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_action_check;

-- Step 2: Drop enhanced workflow index
DROP INDEX IF EXISTS idx_approval_enhanced_status;

-- Step 3: Validate that no enhanced workflow data exists before rollback
DO $$
DECLARE
    enhanced_count INTEGER;
BEGIN
    -- Check for enhanced workflow statuses
    SELECT COUNT(*) INTO enhanced_count
    FROM approvals
    WHERE previous_status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR', 'HR_APPROVED')
       OR new_status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR', 'HR_APPROVED');
    
    IF enhanced_count > 0 THEN
        RAISE WARNING 'Found % records with enhanced workflow statuses. These will become invalid after rollback.', enhanced_count;
    END IF;
    
    -- Check for enhanced workflow actions
    SELECT COUNT(*) INTO enhanced_count
    FROM approvals
    WHERE action IN ('FINAL_APPROVAL', 'HR_APPROVE', 'HR_REJECT');
    
    IF enhanced_count > 0 THEN
        RAISE WARNING 'Found % records with enhanced workflow actions. These will become invalid after rollback.', enhanced_count;
    END IF;
END $$;

-- Step 4: Restore original V5 constraints
ALTER TABLE approvals ADD CONSTRAINT approvals_previous_status_check
CHECK (previous_status IN (
    'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW', 'TUTOR_APPROVED',
    'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'FINAL_APPROVED', 'REJECTED'
));

ALTER TABLE approvals ADD CONSTRAINT approvals_new_status_check
CHECK (new_status IN (
    'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW', 'TUTOR_APPROVED',
    'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'FINAL_APPROVED', 'REJECTED'
));

ALTER TABLE approvals ADD CONSTRAINT approvals_action_check
CHECK (action IN ('SUBMIT_FOR_APPROVAL', 'APPROVE', 'REJECT', 'REQUEST_MODIFICATION'));

-- Step 5: Log rollback completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully rolled back to original V5 approval constraints';
    RAISE NOTICE 'Removed support for: APPROVED_BY_TUTOR, APPROVED_BY_LECTURER_AND_TUTOR, HR_APPROVED';
    RAISE NOTICE 'Removed support for actions: FINAL_APPROVAL, HR_APPROVE, HR_REJECT';
    RAISE NOTICE 'IMPORTANT: Any data with enhanced workflow values will now violate constraints';
END $$;