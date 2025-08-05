package com.usyd.catams.enums;

/**
 * Approval status enumeration for timesheet workflow management.
 * 
 * This enum defines the possible states of a timesheet through its approval lifecycle,
 * supporting the complete workflow from initial creation to final approval or rejection.
 * 
 * Based on architecture specification in docs/architecture-v0.2.md#4.3
 */
public enum ApprovalStatus {
    
    /**
     * Initial state when timesheet is created but not yet submitted for approval.
     * Timesheet can be edited by the creator (LECTURER).
     */
    DRAFT("draft"),
    
    /**
     * Timesheet has been submitted and is waiting for lecturer approval.
     * Lecturer can approve, reject, or request modifications.
     */
    PENDING_LECTURER_APPROVAL("pending_lecturer_approval"),
    
    /**
     * Timesheet has been submitted and is waiting for tutor review/confirmation.
     * Tutor can approve or request modifications.
     */
    PENDING_TUTOR_REVIEW("pending_tutor_review"),
    
    /**
     * Lecturer has approved the timesheet.
     * This is an intermediate state that automatically transitions to PENDING_HR_REVIEW.
     */
    APPROVED("approved"),
    
    /**
     * Tutor has approved the timesheet and it's ready for HR review.
     * No further tutor action required.
     */
    TUTOR_APPROVED("tutor_approved"),
    
    /**
     * Tutor has requested modifications to the timesheet.
     * Timesheet returns to editable state for LECTURER.
     */
    MODIFICATION_REQUESTED("modification_requested"),
    
    /**
     * Timesheet is approved by tutor and waiting for final HR approval.
     * HR can give final approval or reject.
     */
    PENDING_HR_REVIEW("pending_hr_review"),
    
    /**
     * Final state - timesheet has been approved by all parties.
     * No further changes allowed, ready for payroll processing.
     */
    FINAL_APPROVED("final_approved"),
    
    /**
     * Timesheet has been rejected during the approval process.
     * Timesheet can be edited and resubmitted.
     */
    REJECTED("rejected");
    
    private final String value;
    
    ApprovalStatus(String value) {
        this.value = value;
    }
    
    /**
     * Get the string value representation of the approval status.
     * 
     * @return the string value
     */
    public String getValue() {
        return value;
    }
    
    /**
     * Parse approval status from string value.
     * 
     * @param value the string value to parse
     * @return the corresponding ApprovalStatus
     * @throws IllegalArgumentException if value is not recognized
     */
    public static ApprovalStatus fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Approval status value cannot be null");
        }
        
        for (ApprovalStatus status : ApprovalStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        
        throw new IllegalArgumentException("Unknown approval status value: " + value);
    }
    
    /**
     * Check if the status allows editing of the timesheet.
     * 
     * @return true if timesheet can be edited in this status
     */
    public boolean isEditable() {
        return this == DRAFT || this == MODIFICATION_REQUESTED || this == REJECTED;
    }
    
    /**
     * Check if the status is a pending state requiring action.
     * 
     * @return true if status is pending some action
     */
    public boolean isPending() {
        return this == PENDING_LECTURER_APPROVAL || this == PENDING_TUTOR_REVIEW || this == PENDING_HR_REVIEW;
    }
    
    /**
     * Check if the status represents a final state (no further workflow).
     * 
     * @return true if status is final
     */
    public boolean isFinal() {
        return this == FINAL_APPROVED;
    }
    
    /**
     * Get the next possible statuses from the current status.
     * 
     * @return array of possible next statuses
     */
    public ApprovalStatus[] getNextPossibleStatuses() {
        switch (this) {
            case DRAFT:
                return new ApprovalStatus[]{PENDING_LECTURER_APPROVAL, PENDING_TUTOR_REVIEW};
            case PENDING_LECTURER_APPROVAL:
                return new ApprovalStatus[]{APPROVED, REJECTED, MODIFICATION_REQUESTED};
            case APPROVED:
                return new ApprovalStatus[]{PENDING_HR_REVIEW, FINAL_APPROVED};
            case PENDING_TUTOR_REVIEW:
                return new ApprovalStatus[]{TUTOR_APPROVED, PENDING_HR_REVIEW, MODIFICATION_REQUESTED, REJECTED};
            case TUTOR_APPROVED:
                return new ApprovalStatus[]{PENDING_HR_REVIEW};
            case MODIFICATION_REQUESTED:
                return new ApprovalStatus[]{DRAFT, PENDING_LECTURER_APPROVAL, PENDING_TUTOR_REVIEW};
            case PENDING_HR_REVIEW:
                return new ApprovalStatus[]{FINAL_APPROVED, APPROVED, REJECTED, MODIFICATION_REQUESTED};
            case FINAL_APPROVED:
            case REJECTED:
                return new ApprovalStatus[]{}; // Final states
            default:
                return new ApprovalStatus[]{};
        }
    }
    
    /**
     * Check if transition from current status to target status is valid.
     * 
     * @param targetStatus the target status to transition to
     * @return true if transition is valid
     */
    public boolean canTransitionTo(ApprovalStatus targetStatus) {
        if (targetStatus == null) {
            return false;
        }
        
        ApprovalStatus[] possibleStatuses = getNextPossibleStatuses();
        for (ApprovalStatus status : possibleStatuses) {
            if (status == targetStatus) {
                return true;
            }
        }
        return false;
    }
    
    @Override
    public String toString() {
        return value;
    }
}