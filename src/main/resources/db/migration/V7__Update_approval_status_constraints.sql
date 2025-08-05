-- V7__Update_approval_status_constraints.sql
-- Update approval table constraints to support enhanced workflow
-- This migration adds support for new approval statuses while maintaining backward compatibility

-- Step 1: Drop existing constraints (cannot modify CHECK constraints in place)
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_previous_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_new_status_check;
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_action_check;

-- Step 2: Validate existing data before applying new constraints
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check for invalid previous_status values
    SELECT COUNT(*) INTO invalid_count
    FROM approvals
    WHERE previous_status NOT IN (
        'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW',
        'TUTOR_APPROVED', 'APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR',
        'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'HR_APPROVED',
        'FINAL_APPROVED', 'REJECTED'
    );
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % invalid previous_status values. Migration cannot proceed.', invalid_count;
    END IF;
    
    -- Check for invalid new_status values
    SELECT COUNT(*) INTO invalid_count
    FROM approvals
    WHERE new_status NOT IN (
        'DRAFT', 'PENDING_LECTURER_APPROVAL', 'PENDING_TUTOR_REVIEW',
        'TUTOR_APPROVED', 'APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR',
        'MODIFICATION_REQUESTED', 'PENDING_HR_REVIEW', 'HR_APPROVED',
        'FINAL_APPROVED', 'REJECTED'
    );
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % invalid new_status values. Migration cannot proceed.', invalid_count;
    END IF;
END $$;

-- Step 3: Apply comprehensive constraints
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

-- Step 4: Add constraint for action values (ensure completeness)
ALTER TABLE approvals ADD CONSTRAINT approvals_action_check
CHECK (action IN (
    'SUBMIT_FOR_APPROVAL', 'APPROVE', 'REJECT', 'REQUEST_MODIFICATION',
    'FINAL_APPROVAL', 'HR_APPROVE', 'HR_REJECT'
));

-- Step 5: Create index for new enum values (performance optimization)
CREATE INDEX IF NOT EXISTS idx_approval_enhanced_status
ON approvals(new_status)
WHERE new_status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR');

-- Step 6: Update table documentation
COMMENT ON CONSTRAINT approvals_previous_status_check ON approvals IS 
'Ensures previous_status contains only valid ApprovalStatus enum values including enhanced workflow states';

COMMENT ON CONSTRAINT approvals_new_status_check ON approvals IS
'Ensures new_status contains only valid ApprovalStatus enum values including enhanced workflow states';

COMMENT ON CONSTRAINT approvals_action_check ON approvals IS
'Ensures action contains only valid ApprovalAction enum values including enhanced workflow actions';

-- Step 7: Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully updated approval status constraints to support dual workflow paths';
    RAISE NOTICE 'Added support for: APPROVED_BY_TUTOR, APPROVED_BY_LECTURER_AND_TUTOR, HR_APPROVED';
    RAISE NOTICE 'Added support for actions: FINAL_APPROVAL, HR_APPROVE, HR_REJECT';
END $$;