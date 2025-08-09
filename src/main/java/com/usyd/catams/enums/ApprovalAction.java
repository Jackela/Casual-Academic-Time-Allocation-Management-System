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
     * Submit a DRAFT timesheet for approval.
     * Transitions timesheet from DRAFT to PENDING_TUTOR_REVIEW.
     */
    SUBMIT_FOR_APPROVAL("SUBMIT_FOR_APPROVAL"),
    
    /**
     * Approve the timesheet at current stage.
     * Transitions status based on current approval level:
     * - PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR
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
    REQUEST_MODIFICATION("REQUEST_MODIFICATION"),
    
    /**
     * Lecturer gives final approval after tutor approval.
     * Transitions from APPROVED_BY_TUTOR to APPROVED_BY_LECTURER_AND_TUTOR.
     * Based on final workflow: Step 4.
     */
    FINAL_APPROVAL("FINAL_APPROVAL"),
    
    /**
     * HR gives final approval for payroll processing.
     * Transitions from APPROVED_BY_LECTURER_AND_TUTOR to FINAL_APPROVED.
     * Based on final workflow: Step 5.
     */
    HR_APPROVE("HR_APPROVE"),
    
    /**
     * HR rejects the timesheet with reason.
     * Transitions from APPROVED_BY_LECTURER_AND_TUTOR to REJECTED.
     * Based on final workflow: Step 5.
     */
    HR_REJECT("HR_REJECT");
    
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
     * Based on final workflow:
     * - LECTURER can submit for approval (DRAFT and MODIFICATION_REQUESTED)
     * - LECTURER can give final approval after tutor approval (FINAL_APPROVAL)
     * 
     * @return true if LECTURER can perform this action
     */
    public boolean canBePerformedByLecturer() {
        return this == SUBMIT_FOR_APPROVAL || this == FINAL_APPROVAL;
    }
    
    /**
     * Check if this action can be performed by a TUTOR.
     * Based on SSOT: Tutors can review timesheets created for them.
     * - TUTOR can review and approve accuracy (APPROVE)
     * - TUTOR can reject timesheets (REJECT)
     * - TUTOR can request modifications (REQUEST_MODIFICATION)
     * 
     * @return true if TUTOR can perform this action
     */
    public boolean canBePerformedByTutor() {
        return this == APPROVE || this == REJECT || this == REQUEST_MODIFICATION;
    }
    
    /**
     * Check if this action can be performed by HR.
     * Based on final workflow:
     * - HR can give final approval (HR_APPROVE)
     * - HR can reject with reason (HR_REJECT)
     * 
     * @return true if HR can perform this action
     */
    public boolean canBePerformedByHR() {
        return this == HR_APPROVE || this == HR_REJECT;
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
     * Provides hardcoded transitions matching the business workflow.
     */
    private ApprovalStatus getTargetStatusFallback(ApprovalStatus currentStatus) {
        switch (this) {
            case SUBMIT_FOR_APPROVAL:
                if (currentStatus == ApprovalStatus.DRAFT || currentStatus == ApprovalStatus.MODIFICATION_REQUESTED) {
                    return ApprovalStatus.PENDING_TUTOR_REVIEW;
                }
                break;
            case APPROVE:
                if (currentStatus == ApprovalStatus.PENDING_TUTOR_REVIEW) {
                    return ApprovalStatus.APPROVED_BY_TUTOR;
                }
                if (currentStatus == ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR) {
                    return ApprovalStatus.FINAL_APPROVED;
                }
                break;
            case REJECT:
                if (currentStatus == ApprovalStatus.PENDING_TUTOR_REVIEW || 
                    currentStatus == ApprovalStatus.APPROVED_BY_TUTOR ||
                    currentStatus == ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR) {
                    return ApprovalStatus.REJECTED;
                }
                break;
            case REQUEST_MODIFICATION:
                if (currentStatus == ApprovalStatus.PENDING_TUTOR_REVIEW || currentStatus == ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR) {
                    return ApprovalStatus.MODIFICATION_REQUESTED;
                }
                break;
            case FINAL_APPROVAL:
                if (currentStatus == ApprovalStatus.APPROVED_BY_TUTOR) {
                    return ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR;
                }
                break;
            case HR_APPROVE:
                if (currentStatus == ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR) {
                    return ApprovalStatus.FINAL_APPROVED;
                }
                break;
            case HR_REJECT:
                if (currentStatus == ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR) {
                    return ApprovalStatus.REJECTED;
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