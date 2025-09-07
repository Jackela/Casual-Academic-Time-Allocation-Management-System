package com.usyd.catams.test.assertions;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import org.assertj.core.api.AbstractAssert;

/**
 * Custom AssertJ assertions for Timesheet entities that focus on business behaviors
 * rather than internal implementation details.
 * 
 * This class provides domain-specific assertions that remain stable even when
 * internal status values change, following the principle of testing behavior
 * rather than implementation.
 * 
 * Usage examples:
 * - assertThat(timesheet).isEditable()
 * - assertThat(timesheet).isReadyForApproval() 
 * - assertThat(timesheet).hasCompletedWorkflow()
 * 
 * @author Development Team
 * @since 1.1
 */
public class TimesheetAssertions extends AbstractAssert<TimesheetAssertions, Timesheet> {
    
    public TimesheetAssertions(Timesheet actual) {
        super(actual, TimesheetAssertions.class);
    }
    
    /**
     * Factory method for creating TimesheetAssertions.
     * 
     * @param actual the timesheet to assert on
     * @return TimesheetAssertions instance
     */
    public static TimesheetAssertions assertThat(Timesheet actual) {
        return new TimesheetAssertions(actual);
    }
    
    /**
     * Asserts that the timesheet can be edited by its creator.
     * 
     * Business rule: Timesheets can be edited when in DRAFT, MODIFICATION_REQUESTED, or REJECTED states.
     */
    public TimesheetAssertions isEditable() {
        isNotNull();
        if (!actual.isEditable()) {
            failWithMessage("Expected timesheet to be editable but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet cannot be edited.
     * 
     * Business rule: Timesheets cannot be edited when in pending or approved states.
     */
    public TimesheetAssertions isNotEditable() {
        isNotNull();
        if (actual.isEditable()) {
            failWithMessage("Expected timesheet to not be editable but it was. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet can be confirmed by an authorized user.
     * 
     * Business rule: Timesheets can be confirmed when in PENDING_TUTOR_CONFIRMATION or LECTURER_CONFIRMED states.
     */
    public TimesheetAssertions canBeConfirmed() {
        isNotNull();
        if (!actual.canBeConfirmed()) {
            failWithMessage("Expected timesheet to be confirmable but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet cannot be confirmed.
     * 
     * Business rule: Timesheets cannot be confirmed when in DRAFT, final, or intermediate states.
     */
    public TimesheetAssertions cannotBeConfirmed() {
        isNotNull();
        if (actual.canBeConfirmed()) {
            failWithMessage("Expected timesheet to not be confirmable but it was. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet is in a pending state requiring action.
     * 
     * Business rule: Pending states are those waiting for reviewer action.
     */
    public TimesheetAssertions isPending() {
        isNotNull();
        if (!actual.getStatus().isPending()) {
            failWithMessage("Expected timesheet to be in pending state but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet is not in a pending state.
     */
    public TimesheetAssertions isNotPending() {
        isNotNull();
        if (actual.getStatus().isPending()) {
            failWithMessage("Expected timesheet to not be in pending state but it was. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet has reached a final state (workflow complete).
     * 
     * Business rule: Final state means no further workflow actions are possible.
     */
    public TimesheetAssertions isFinal() {
        isNotNull();
        if (!actual.getStatus().isFinal()) {
            failWithMessage("Expected timesheet to be in final state but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet has not reached a final state.
     */
    public TimesheetAssertions isNotFinal() {
        isNotNull();
        if (actual.getStatus().isFinal()) {
            failWithMessage("Expected timesheet to not be in final state but it was. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet is ready for HR review specifically.
     * 
     * Business rule: Ready for HR means tutor has approved and it's in HR queue.
     */
    public TimesheetAssertions isReadyForHRReview() {
        isNotNull();
        if (actual.getStatus() != ApprovalStatus.LECTURER_CONFIRMED) {
            failWithMessage("Expected timesheet to be ready for HR review but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet is awaiting tutor review.
     * 
     * Business rule: Awaiting tutor review means it has been submitted but not yet reviewed.
     */
    public TimesheetAssertions isAwaitingTutorReview() {
        isNotNull();
        if (actual.getStatus() != ApprovalStatus.PENDING_TUTOR_CONFIRMATION) {
            failWithMessage("Expected timesheet to be awaiting tutor review but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet requires modification from the creator.
     * 
     * Business rule: Modification requested means reviewer wants changes before approval.
     */
    public TimesheetAssertions requiresModification() {
        isNotNull();
        if (actual.getStatus() != ApprovalStatus.MODIFICATION_REQUESTED) {
            failWithMessage("Expected timesheet to require modification but it did not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet was rejected.
     * 
     * Business rule: Rejected timesheets can be edited and resubmitted.
     */
    public TimesheetAssertions wasRejected() {
        isNotNull();
        if (actual.getStatus() != ApprovalStatus.REJECTED) {
            failWithMessage("Expected timesheet to be rejected but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet is in draft state.
     * 
     * Business rule: Draft timesheets are being prepared and haven't been submitted.
     */
    public TimesheetAssertions isDraft() {
        isNotNull();
        if (actual.getStatus() != ApprovalStatus.DRAFT) {
            failWithMessage("Expected timesheet to be in draft state but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet has been fully approved (final state).
     * 
     * Business rule: Fully approved means both tutor and HR have approved.
     */
    public TimesheetAssertions isFullyApproved() {
        isNotNull();
        if (actual.getStatus() != ApprovalStatus.FINAL_CONFIRMED) {
            failWithMessage("Expected timesheet to be fully approved but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet is in an intermediate approved state.
     * 
     * Business rule: Tutor approved but not yet transitioned to HR review.
     */
    public TimesheetAssertions isTutorApproved() {
        isNotNull();
        if (actual.getStatus() != ApprovalStatus.TUTOR_CONFIRMED) {
            failWithMessage("Expected timesheet to be tutor approved but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet can be resubmitted (after modification request).
     * 
     * Business rule: Only MODIFICATION_REQUESTED timesheets can be resubmitted.
     * REJECTED timesheets are terminal and require new timesheet creation.
     */
    public TimesheetAssertions canBeResubmitted() {
        isNotNull();
        boolean canResubmit = actual.getStatus() == ApprovalStatus.MODIFICATION_REQUESTED;
        if (!canResubmit) {
            failWithMessage("Expected timesheet to be resubmittable but it was not. Current status: <%s>", 
                           actual.getStatus());
        }
        return this;
    }
    
    /**
     * Asserts that the timesheet has progressed beyond a specific stage in the workflow.
     * 
     * This provides a relative comparison for workflow progression testing.
     */
    public TimesheetAssertions hasProgressedBeyond(ApprovalStatus previousStatus) {
        isNotNull();
        
        // Define workflow progression order
        int currentOrder = getWorkflowOrder(actual.getStatus());
        int previousOrder = getWorkflowOrder(previousStatus);
        
        if (currentOrder <= previousOrder) {
            failWithMessage("Expected timesheet to have progressed beyond <%s> but it has not. Current status: <%s>", 
                           previousStatus, actual.getStatus());
        }
        return this;
    }
    
    /**
     * Helper method to determine workflow progression order.
     */
    private int getWorkflowOrder(ApprovalStatus status) {
        switch (status) {
            case DRAFT: return 1;
            case PENDING_TUTOR_CONFIRMATION: return 2;
            case TUTOR_CONFIRMED: return 3;
            case LECTURER_CONFIRMED: return 4;
            case FINAL_CONFIRMED: return 5;
            case MODIFICATION_REQUESTED: return 1; // Can restart workflow
            case REJECTED: return 6; // Terminal state, no restart
            default: return 0;
        }
    }
}
