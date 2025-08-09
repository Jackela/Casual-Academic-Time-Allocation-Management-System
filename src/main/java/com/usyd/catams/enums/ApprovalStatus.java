package com.usyd.catams.enums;

/**
 * Approval status enumeration for timesheet workflow management.
 * 
 * This enum defines the possible states of a timesheet through its approval lifecycle,
 * supporting the complete workflow from initial creation to final approval or rejection.
 * 
 * Based on SSOT document in docs/timesheet-approval-workflow-ssot.md
 */
public enum ApprovalStatus {
    
    /**
     * Initial state when timesheet is created but not yet submitted for approval.
     * Timesheet can be edited by the creator (LECTURER).
     */
    DRAFT("draft"),
    
    
    /**
     * Timesheet has been submitted and is waiting for tutor review/confirmation.
     * Tutor can approve or request modifications.
     */
    PENDING_TUTOR_REVIEW("pending_tutor_review"),
    
    
    /**
     * Timesheet has been approved by the tutor and is awaiting final lecturer approval.
     * Based on final workflow: TUTOR approves accuracy, then LECTURER gives final approval.
     */
    APPROVED_BY_TUTOR("approved_by_tutor"),
    
    /**
     * Timesheet has been approved by both lecturer and tutor, ready for HR processing.
     * This status indicates academic approval is complete and HR can give final approval.
     */
    APPROVED_BY_LECTURER_AND_TUTOR("approved_by_lecturer_and_tutor"),
    
    /**
     * Timesheet has been fully approved by HR and is ready for payroll processing.
     * This is a terminal state - no further actions allowed.
     * This is the only approved terminal state per SSOT.
     */
    FINAL_APPROVED("final_approved"),
    
    
    /**
     * Timesheet has been rejected during the approval process.
     * Can be rejected by either tutor or HR with rejection reasons.
     * Lecturer can resubmit after making corrections.
     */
    REJECTED("rejected"),
    
    /**
     * Timesheet requires modifications before it can proceed.
     * Returned to the creator for corrections.
     */
    MODIFICATION_REQUESTED("modification_requested");

    private final String value;

    ApprovalStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Gets the display name for UI purposes.
     * 
     * @return Human-readable status name
     */
    public String getDisplayName() {
        switch (this) {
            case DRAFT:
                return "Draft";
            case PENDING_TUTOR_REVIEW:
                return "Pending Tutor Review";
            case APPROVED_BY_TUTOR:
                return "Approved by Tutor";
            case APPROVED_BY_LECTURER_AND_TUTOR:
                return "Approved by Lecturer and Tutor";
            case FINAL_APPROVED:
                return "Final Approved";
            case REJECTED:
                return "Rejected";
            case MODIFICATION_REQUESTED:
                return "Modification Requested";
            default:
                return this.name();
        }
    }

    /**
     * Checks if the status represents a pending state requiring action.
     * According to SSOT, only PENDING_TUTOR_REVIEW is truly "pending".
     * 
     * @return true if status is pending review/approval
     */
    public boolean isPending() {
        return this == PENDING_TUTOR_REVIEW || this == APPROVED_BY_TUTOR || this == APPROVED_BY_LECTURER_AND_TUTOR;
    }

    /**
     * Checks if the status represents a terminal/final state.
     * Per SSOT, only FINAL_APPROVED and REJECTED are terminal states.
     * 
     * @return true if no further actions are allowed
     */
    public boolean isFinal() {
        return this == FINAL_APPROVED || this == REJECTED;
    }

    /**
     * Checks if the timesheet can be edited in this status.
     * 
     * @return true if timesheet can be modified
     */
    public boolean isEditable() {
        return this == DRAFT || this == MODIFICATION_REQUESTED;
    }

    /**
     * Checks if this status can transition to another status.
     * This method follows SSOT workflow transitions exactly.
     * 
     * @param targetStatus The target status to transition to
     * @return true if transition is allowed
     */
    public boolean canTransitionTo(ApprovalStatus targetStatus) {
        if (targetStatus == null) {
            return false;
        }

        switch (this) {
            case DRAFT:
                // LECTURER submits for tutor review
                return targetStatus == PENDING_TUTOR_REVIEW;
                
            case PENDING_TUTOR_REVIEW:
                // TUTOR can approve, reject, or request modifications
                // Streamlined path: allow direct progression to HR queue after tutor approval
                return targetStatus == APPROVED_BY_TUTOR || 
                       targetStatus == APPROVED_BY_LECTURER_AND_TUTOR ||
                       targetStatus == REJECTED || 
                       targetStatus == MODIFICATION_REQUESTED;
                       
            case APPROVED_BY_TUTOR:
                // LECTURER gives final academic approval
                return targetStatus == APPROVED_BY_LECTURER_AND_TUTOR;
                
            case APPROVED_BY_LECTURER_AND_TUTOR:
                // HR can give final approval or reject, or request modification back to lecturer
                return targetStatus == FINAL_APPROVED || 
                       targetStatus == REJECTED ||
                       targetStatus == MODIFICATION_REQUESTED;
                       
            case MODIFICATION_REQUESTED:
                // LECTURER resubmits after corrections
                return targetStatus == PENDING_TUTOR_REVIEW;
                
            case REJECTED:
                // TUTOR edits and resubmits (starts new cycle)
                return targetStatus == PENDING_TUTOR_REVIEW;
                
            case FINAL_APPROVED:
                return false; // Terminal state - no further transitions
                
            default:
                return false;
        }
    }

    /**
     * Parse status from string value (legacy support).
     * 
     * @param value The string value to parse
     * @return The corresponding ApprovalStatus
     * @throws IllegalArgumentException if value is invalid
     */
    public static ApprovalStatus fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Approval status value cannot be null");
        }
        
        for (ApprovalStatus status : values()) {
            if (status.getValue().equals(value)) {
                return status;
            }
        }
        
        throw new IllegalArgumentException("Invalid approval status value: " + value);    }
}