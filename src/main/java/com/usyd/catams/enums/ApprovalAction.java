package com.usyd.catams.enums;

import com.usyd.catams.common.application.ApprovalStateMachine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Approval action enumeration for timesheet approval workflow.
 * 
 * This enum defines the possible actions that can be performed on a timesheet
 * during the approval process, supporting the complete workflow from submission
 * to final approval or rejection.
 * 
 * Based on SSOT document in docs/timesheet-approval-workflow-ssot.md
 */
public enum ApprovalAction {
    
    /**
     * Submit a DRAFT timesheet for confirmation process.
     * Can be performed by LECTURER or TUTOR (self).
     * Transitions timesheet from DRAFT to PENDING_TUTOR_CONFIRMATION.
     */
    SUBMIT_FOR_APPROVAL("SUBMIT_FOR_APPROVAL"),
    
    /**
     * Tutor confirms the timesheet accuracy.
     * Transitions from PENDING_TUTOR_CONFIRMATION to TUTOR_CONFIRMED.
     */
    TUTOR_CONFIRM("TUTOR_CONFIRM"),
    
    /**
     * Lecturer confirms the timesheet (with optional comment/reason).
     * Transitions from TUTOR_CONFIRMED to LECTURER_CONFIRMED.
     */
    LECTURER_CONFIRM("LECTURER_CONFIRM"),
    
    /**
     * HR/Admin gives final confirmation for payroll processing.
     * Transitions from LECTURER_CONFIRMED to FINAL_CONFIRMED.
     */
    HR_CONFIRM("HR_CONFIRM"),
    
    /**
     * Reject the timesheet.
     * Can be performed by LECTURER or HR/Admin.
     * Transitions status to REJECTED from any confirmation state.
     */
    REJECT("REJECT"),
    
    /**
     * Request modifications to the timesheet.
     * Can be performed by LECTURER or HR/Admin.
     * Transitions status to MODIFICATION_REQUESTED from any confirmation state.
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
     * Based on new confirmation workflow:
     * - LECTURER can submit for confirmation (DRAFT and MODIFICATION_REQUESTED)
     * - LECTURER can confirm after tutor confirmation (LECTURER_CONFIRM)
     * - LECTURER can reject or request modifications at any confirmation stage
     * 
     * @return true if LECTURER can perform this action
     */
    public boolean canBePerformedByLecturer() {
        return this == SUBMIT_FOR_APPROVAL || this == LECTURER_CONFIRM || 
               this == REJECT || this == REQUEST_MODIFICATION;
    }
    
    /**
     * Check if this action can be performed by a TUTOR.
     * Based on new workflow: Tutors can only confirm and submit their own timesheets.
     * - TUTOR can submit their own draft timesheets (SUBMIT_FOR_APPROVAL)
     * - TUTOR can confirm timesheets assigned to them (TUTOR_CONFIRM)
     * Note: TUTOR cannot reject or request modifications - only confirm.
     * 
     * @return true if TUTOR can perform this action
     */
    public boolean canBePerformedByTutor() {
        return this == SUBMIT_FOR_APPROVAL || this == TUTOR_CONFIRM;
    }
    
    /**
     * Check if this action can be performed by HR.
     * Based on new workflow:
     * - HR can give final confirmation (HR_CONFIRM)
     * - HR can reject with reason (REJECT)
     * - HR can request modifications (REQUEST_MODIFICATION)
     * 
     * @return true if HR can perform this action
     */
    public boolean canBePerformedByHR() {
        return this == HR_CONFIRM || this == REJECT || this == REQUEST_MODIFICATION;
    }
    
    /**
     * Check if this action can be performed by an ADMIN.
     * ADMIN has override capabilities for all actions.
     * 
     * @return true if ADMIN can perform this action
     */
    public boolean canBePerformedByAdmin() {
        return true; // ADMIN can perform any action
    }
    
    /**
     * Get the target status for this action given the current status.
     * Delegates to ApprovalStateMachine for SSOT.
     * 
     * @param currentStatus the current approval status
     * @return the target status after performing this action
     * @throws IllegalStateException if action is not valid for current status
     * @throws IllegalStateException if called before Spring context initialization
     */
    public ApprovalStatus getTargetStatus(ApprovalStatus currentStatus) {
        if (StateMachineHolder.instance == null) {
            // Fallback for unit tests - use hardcoded transitions
            return getTargetStatusFallback(currentStatus);
        }
        return StateMachineHolder.instance.getNextStatus(currentStatus, this);
    }
    
    /**
     * Fallback method for unit tests when Spring context is not available.
     * Provides hardcoded transitions matching the new confirmation workflow.
     */
    private ApprovalStatus getTargetStatusFallback(ApprovalStatus currentStatus) {
        switch (this) {
            case SUBMIT_FOR_APPROVAL:
                if (currentStatus == ApprovalStatus.DRAFT || currentStatus == ApprovalStatus.MODIFICATION_REQUESTED) {
                    return ApprovalStatus.PENDING_TUTOR_CONFIRMATION;
                }
                break;
            case TUTOR_CONFIRM:
                if (currentStatus == ApprovalStatus.PENDING_TUTOR_CONFIRMATION) {
                    return ApprovalStatus.TUTOR_CONFIRMED;
                }
                break;
            case LECTURER_CONFIRM:
                if (currentStatus == ApprovalStatus.TUTOR_CONFIRMED) {
                    return ApprovalStatus.LECTURER_CONFIRMED;
                }
                break;
            case HR_CONFIRM:
                if (currentStatus == ApprovalStatus.LECTURER_CONFIRMED) {
                    return ApprovalStatus.FINAL_CONFIRMED;
                }
                break;
            case REJECT:
                if (currentStatus == ApprovalStatus.PENDING_TUTOR_CONFIRMATION || 
                    currentStatus == ApprovalStatus.TUTOR_CONFIRMED ||
                    currentStatus == ApprovalStatus.LECTURER_CONFIRMED) {
                    return ApprovalStatus.REJECTED;
                }
                break;
            case REQUEST_MODIFICATION:
                if (currentStatus == ApprovalStatus.PENDING_TUTOR_CONFIRMATION || 
                    currentStatus == ApprovalStatus.TUTOR_CONFIRMED ||
                    currentStatus == ApprovalStatus.LECTURER_CONFIRMED) {
                    return ApprovalStatus.MODIFICATION_REQUESTED;
                }
                break;
        }
        throw new IllegalStateException("Invalid transition: Cannot perform action " + this + " from status " + currentStatus);
    }
    
    /**
     * Static holder for ApprovalStateMachine instance.
     * This allows the enum to access the state machine after Spring context initialization.
     */
    @Component
    public static class StateMachineHolder {
        public static ApprovalStateMachine instance;
        
        @Autowired
        private ApprovalStateMachine stateMachine;
        
        @PostConstruct
        void init() {
            instance = stateMachine;
        }
    }
    
    @Override
    public String toString() {
        return value;
    }
}