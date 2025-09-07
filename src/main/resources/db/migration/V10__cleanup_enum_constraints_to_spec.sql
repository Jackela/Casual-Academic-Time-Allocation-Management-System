-- V10__cleanup_enum_constraints_to_spec.sql  
-- Clean up database constraints to match exact specification requirements
-- Removes legacy enum values not in the confirmation workflow specification

-- Step 1: Drop existing constraints
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_previous_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_new_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_action_check;
ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_status_check;

-- Step 2: Add constraints with ONLY specification-defined enum values
ALTER TABLE approvals ADD CONSTRAINT approvals_previous_status_check
CHECK (previous_status IN (
    'DRAFT', 'PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 
    'LECTURER_CONFIRMED', 'FINAL_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'
));

ALTER TABLE approvals ADD CONSTRAINT approvals_new_status_check
CHECK (new_status IN (
    'DRAFT', 'PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED',
    'LECTURER_CONFIRMED', 'FINAL_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'
));

-- Step 3: Add constraint for actions with ONLY specification-defined values
ALTER TABLE approvals ADD CONSTRAINT approvals_action_check
CHECK (action IN (
    'SUBMIT_FOR_APPROVAL', 'TUTOR_CONFIRM', 'LECTURER_CONFIRM', 
    'HR_CONFIRM', 'REJECT', 'REQUEST_MODIFICATION'
));

-- Step 4: Add constraint for timesheet status with ONLY specification-defined values
ALTER TABLE timesheets ADD CONSTRAINT timesheets_status_check
CHECK (status IN (
    'DRAFT', 'PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED',
    'LECTURER_CONFIRMED', 'FINAL_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'
));

-- Step 5: Update documentation
COMMENT ON CONSTRAINT approvals_previous_status_check ON approvals IS 
'Ensures previous_status contains only specification-defined confirmation workflow enum values';

COMMENT ON CONSTRAINT approvals_new_status_check ON approvals IS
'Ensures new_status contains only specification-defined confirmation workflow enum values';

COMMENT ON CONSTRAINT approvals_action_check ON approvals IS
'Ensures action contains only specification-defined confirmation workflow enum values';

COMMENT ON CONSTRAINT timesheets_status_check ON timesheets IS
'Ensures timesheet status contains only specification-defined confirmation workflow enum values';

-- Step 6: Verification log
DO $$
BEGIN
    RAISE NOTICE 'Database constraints cleaned up to match exact specification requirements';
    RAISE NOTICE 'Removed legacy enum values: PENDING_LECTURER_APPROVAL, PENDING_HR_REVIEW, HR_APPROVED';
    RAISE NOTICE 'Specification-compliant workflow: DRAFT → PENDING_TUTOR_CONFIRMATION → TUTOR_CONFIRMED → LECTURER_CONFIRMED → FINAL_CONFIRMED';
END $$;