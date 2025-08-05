package com.usyd.catams.enums;

/**
 * Approval action enumeration for timesheet approval workflow.
 * 
 * This enum defines the possible actions that can be performed on a timesheet
 * during the approval process, supporting the complete workflow from submission
 * to final approval or rejection.
 * 
 * Based on OpenAPI specification for approval actions.
 */
public enum ApprovalAction {
    
    /**
     * Submit a DRAFT timesheet for approval.
     * Transitions timesheet from DRAFT to PENDING_LECTURER_APPROVAL.
     */
    SUBMIT_FOR_APPROVAL("SUBMIT_FOR_APPROVAL"),
    
    /**
     * Approve the timesheet at current stage.
     * Transitions status based on current approval level:
     * - PENDING_LECTURER_APPROVAL → TUTOR_APPROVED
     * - PENDING_HR_REVIEW → FINAL_APPROVED
     */
    APPROVE("APPROVE"),
    
    /**
     * Reject the timesheet.
     * Transitions status to REJECTED from any pending state.
     */
    REJECT("REJECT"),
    
    /**
     * Request modifications to the timesheet.
     * Transitions status to MODIFICATION_REQUESTED from any pending state.
     */
    REQUEST_MODIFICATION("REQUEST_MODIFICATION");
    
    private final String value;
    
    ApprovalAction(String value) {
        this.value = value;
    }
    
    /**
     * Get the string value representation of the approval action.
     * 
     * @return the string value
     */
    public String getValue() {
        return value;
    }
    
    /**
     * Parse approval action from string value.
     * 
     * @param value the string value to parse
     * @return the corresponding ApprovalAction
     * @throws IllegalArgumentException if value is not recognized
     */
    public static ApprovalAction fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Approval action value cannot be null");
        }
        
        for (ApprovalAction action : ApprovalAction.values()) {
            if (action.value.equals(value)) {
                return action;
            }
        }
        
        throw new IllegalArgumentException("Unknown approval action value: " + value);
    }
    
    /**
     * Check if this action can be performed by a LECTURER.
     * 
     * @return true if LECTURER can perform this action
     */
    public boolean canBePerformedByLecturer() {
        return this == APPROVE || this == REJECT || this == REQUEST_MODIFICATION;
    }
    
    /**
     * Check if this action can be performed by a TUTOR.
     * 
     * @return true if TUTOR can perform this action
     */
    public boolean canBePerformedByTutor() {
        return this == SUBMIT_FOR_APPROVAL;
    }
    
    /**
     * Check if this action can be performed by an ADMIN/HR.
     * 
     * @return true if ADMIN can perform this action
     */
    public boolean canBePerformedByAdmin() {
        return true; // ADMIN can perform any action
    }
    
    /**
     * Get the target status for this action given the current status.
     * 
     * @param currentStatus the current approval status
     * @return the target status after performing this action
     * @throws IllegalArgumentException if action is not valid for current status
     */
    public ApprovalStatus getTargetStatus(ApprovalStatus currentStatus) {
        switch (this) {
            case SUBMIT_FOR_APPROVAL:
                if (currentStatus == ApprovalStatus.DRAFT) {
                    return ApprovalStatus.PENDING_LECTURER_APPROVAL;
                }
                break;
                
            case APPROVE:
                if (currentStatus == ApprovalStatus.PENDING_LECTURER_APPROVAL) {
                    return ApprovalStatus.APPROVED;
                } else if (currentStatus == ApprovalStatus.PENDING_TUTOR_REVIEW) {
                    return ApprovalStatus.TUTOR_APPROVED;
                } else if (currentStatus == ApprovalStatus.PENDING_HR_REVIEW) {
                    return ApprovalStatus.FINAL_APPROVED;
                }
                break;
                
            case REJECT:
                if (currentStatus.isPending()) {
                    return ApprovalStatus.REJECTED;
                }
                break;
                
            case REQUEST_MODIFICATION:
                if (currentStatus.isPending()) {
                    return ApprovalStatus.MODIFICATION_REQUESTED;
                }
                break;
        }
        
        throw new IllegalArgumentException("Cannot perform action " + this + " on timesheet with status " + currentStatus.name());
    }
    
    @Override
    public String toString() {
        return value;
    }
}