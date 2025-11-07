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
     * Timesheet has been submitted and is waiting for tutor confirmation.
     * Tutor can only confirm (no approval/rejection powers).
     */
    PENDING_TUTOR_CONFIRMATION("pending_tutor_confirmation"),
    
    /**
     * Timesheet has been confirmed by the tutor and is awaiting lecturer confirmation.
     * Tutor has confirmed accuracy, now awaiting lecturer's confirmation.
     */
    TUTOR_CONFIRMED("tutor_confirmed"),
    
    /**
     * Timesheet has been confirmed by lecturer and is ready for HR final confirmation.
     * Lecturer has provided confirmation (with optional comment/reason).
     */
    LECTURER_CONFIRMED("lecturer_confirmed"),
    
    /**
     * Timesheet has been finally confirmed by HR and is ready for payroll processing.
     * This is a terminal state - no further actions allowed.
     * This is the only approved terminal state per new workflow.
     */
    FINAL_CONFIRMED("final_confirmed"),
    
    
    /**
     * Timesheet has been rejected during the approval process.
     * Can be rejected by tutor, lecturer, or HR with rejection reasons.
     * Tutor or lecturer can edit and resubmit after making corrections.
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
            case PENDING_TUTOR_CONFIRMATION:
                return "Pending Tutor Confirmation";
            case TUTOR_CONFIRMED:
                return "Tutor Confirmed";
            case LECTURER_CONFIRMED:
                return "Lecturer Confirmed";
            case FINAL_CONFIRMED:
                return "Final Confirmed";
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
     * According to new workflow, confirmation states are pending.
     * 
     * @return true if status is pending confirmation
     */
    public boolean isPending() {
        return this == PENDING_TUTOR_CONFIRMATION || this == TUTOR_CONFIRMED || this == LECTURER_CONFIRMED;
    }

    /**
     * Checks if the status represents a terminal/final state.
     * Per new workflow, only FINAL_CONFIRMED is a terminal state.
     * REJECTED allows editing and resubmission.
     * 
     * @return true if no further actions are allowed
     */
    public boolean isFinal() {
        return this == FINAL_CONFIRMED;
    }

    /**
     * Checks if the timesheet can be edited in this status.
     * 
     * @return true if timesheet can be modified
     */
    public boolean isEditable() {
        return this == DRAFT || this == MODIFICATION_REQUESTED || this == REJECTED;
    }

    /**
     * Checks if this status can transition to another status.
     * This method follows the new confirmation workflow transitions exactly.
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
                // LECTURER or TUTOR (self) submits for tutor confirmation
                return targetStatus == PENDING_TUTOR_CONFIRMATION;
                
            case PENDING_TUTOR_CONFIRMATION:
                // TUTOR can confirm, LECTURER/HR can reject or request modifications
                return targetStatus == TUTOR_CONFIRMED || 
                       targetStatus == REJECTED || 
                       targetStatus == MODIFICATION_REQUESTED;
                       
            case TUTOR_CONFIRMED:
                // LECTURER can confirm (with optional comment), LECTURER/HR can reject or request modifications
                return targetStatus == LECTURER_CONFIRMED ||
                       targetStatus == REJECTED ||
                       targetStatus == MODIFICATION_REQUESTED;
                
            case LECTURER_CONFIRMED:
                // HR can give final confirmation, reject, or request modification
                return targetStatus == FINAL_CONFIRMED || 
                       targetStatus == REJECTED ||
                       targetStatus == MODIFICATION_REQUESTED;
                       
            case MODIFICATION_REQUESTED:
                // LECTURER or TUTOR (self) resubmits after corrections
                return targetStatus == PENDING_TUTOR_CONFIRMATION;
                
            case REJECTED:
                // Tutor/Lecturer can edit and resubmit after addressing rejection reasons
                return targetStatus == PENDING_TUTOR_CONFIRMATION;
                
            case FINAL_CONFIRMED:
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