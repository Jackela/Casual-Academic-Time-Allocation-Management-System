package com.usyd.catams.test.scenarios;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.test.fixture.TimesheetWorkflowTestFixture;

/**
 * Predefined test scenarios for common approval workflow testing patterns.
 * 
 * This class provides reusable test scenarios that focus on business behaviors
 * and outcomes rather than specific implementation details. Each scenario
 * represents a real-world business situation that the system must handle correctly.
 * 
 * These scenarios are designed to be resilient to changes in the underlying
 * implementation while ensuring that business requirements are consistently met.
 * 
 * @author Development Team
 * @since 1.1
 */
public class WorkflowTestScenarios {
    
    /**
     * Standard IDs for different user roles in test scenarios.
     */
    public static final Long LECTURER_ID = 1001L;
    public static final Long TUTOR_ID = 2001L;
    public static final Long HR_ID = 3001L;
    
    /**
     * Test scenario: Complete happy path workflow from creation to final approval.
     * 
     * Business context: A lecturer creates a timesheet, submits it, tutor approves,
     * and HR gives final approval. This is the standard successful workflow.
     * 
     * Expected progression: DRAFT → PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR → APPROVED_BY_LECTURER_AND_TUTOR → FINAL_APPROVED
     */
    public static class HappyPathWorkflow {
        public static Timesheet startDraft() {
            return TimesheetWorkflowTestFixture.createDraftScenario();
        }
        
        public static Timesheet afterSubmission() {
            return TimesheetWorkflowTestFixture.createPendingApprovalScenario();
        }
        
        public static Timesheet afterTutorApproval() {
            return TimesheetWorkflowTestFixture.createTutorApprovedScenario();
        }
        
        public static Timesheet inHRQueue() {
            return TimesheetWorkflowTestFixture.createReadyForHRScenario();
        }
        
        public static Timesheet fullyCompleted() {
            return TimesheetWorkflowTestFixture.createCompletedWorkflowScenario();
        }
    }
    
    /**
     * Test scenario: Modification request and resubmission workflow.
     * 
     * Business context: A reviewer requests modifications to a submitted timesheet.
     * The creator makes changes and resubmits for review.
     * 
     * Expected behavior: timesheet becomes editable, can be modified, can be resubmitted
     */
    public static class ModificationRequestWorkflow {
        public static Timesheet afterModificationRequest() {
            return TimesheetWorkflowTestFixture.createRequiresModificationScenario();
        }
        
        public static Timesheet readyForResubmission() {
            // Same as modification requested - business rule allows resubmission
            return TimesheetWorkflowTestFixture.createRequiresModificationScenario();
        }
    }
    
    /**
     * Test scenario: Rejection terminal state.
     * 
     * Business context: A reviewer rejects a timesheet submission. The timesheet
     * becomes a terminal read-only record for audit purposes.
     * 
     * Expected behavior: timesheet becomes read-only, preserves audit trail, requires new creation for resubmission
     */
    public static class RejectionTerminalWorkflow {
        public static Timesheet afterRejection() {
            return TimesheetWorkflowTestFixture.createRejectedScenario();
        }
        
        public static Timesheet terminalState() {
            // Rejected is terminal - no further actions allowed
            return TimesheetWorkflowTestFixture.createRejectedScenario();
        }
    }
    
    /**
     * Test scenario: Edge cases and boundary conditions.
     * 
     * Business context: Various edge cases that the system must handle gracefully,
     * such as attempting invalid transitions or actions on inappropriate states.
     */
    public static class EdgeCaseScenarios {
        public static Timesheet tutorApprovedButNotTransitioned() {
            return TimesheetWorkflowTestFixture.createTutorApprovedScenario();
        }
        
        public static Timesheet alreadyFinalApproved() {
            return TimesheetWorkflowTestFixture.createCompletedWorkflowScenario();
        }
        
        public static Timesheet inIntermediateState() {
            return TimesheetWorkflowTestFixture.createTutorApprovedScenario();
        }
    }
    
    /**
     * Test scenario data for parameterized tests focusing on business behaviors.
     * 
     * This provides test data in a format suitable for @ParameterizedTest methods
     * while maintaining focus on business scenarios rather than implementation details.
     */
    public static class ParameterizedTestData {
        
        /**
         * Scenarios where timesheet should be editable.
         * Business rule: DRAFT and MODIFICATION_REQUESTED allow editing.
         * REJECTED timesheets are terminal and read-only.
         */
        public static Object[][] editableScenarios() {
            return new Object[][] {
                { "Draft timesheet", TimesheetWorkflowTestFixture.createDraftScenario() },
                { "Modification requested", TimesheetWorkflowTestFixture.createRequiresModificationScenario() }
            };
        }
        
        /**
         * Scenarios where timesheet should not be editable.
         * Business rule: Pending and approved states prevent editing.
         */
        public static Object[][] nonEditableScenarios() {
            return new Object[][] {
                { "Pending tutor review", TimesheetWorkflowTestFixture.createPendingApprovalScenario() },
                { "Tutor approved", TimesheetWorkflowTestFixture.createTutorApprovedScenario() },
                { "Ready for HR", TimesheetWorkflowTestFixture.createReadyForHRScenario() },
                { "Fully approved", TimesheetWorkflowTestFixture.createCompletedWorkflowScenario() },
                { "Rejected (terminal)", TimesheetWorkflowTestFixture.createRejectedScenario() }
            };
        }
        
        /**
         * Scenarios where timesheet can be approved.
         * Business rule: PENDING_TUTOR_REVIEW and APPROVED_BY_LECTURER_AND_TUTOR allow approval actions.
         */
        public static Object[][] approvableScenarios() {
            return new Object[][] {
                { "Awaiting tutor review", TimesheetWorkflowTestFixture.createPendingApprovalScenario() },
                { "Ready for HR approval", TimesheetWorkflowTestFixture.createReadyForHRScenario() }
            };
        }
        
        /**
         * Scenarios where timesheet cannot be approved.
         * Business rule: DRAFT, intermediate, and final states don't allow approval actions.
         */
        public static Object[][] nonApprovableScenarios() {
            return new Object[][] {
                { "Draft timesheet", TimesheetWorkflowTestFixture.createDraftScenario() },
                { "Tutor approved (intermediate)", TimesheetWorkflowTestFixture.createTutorApprovedScenario() },
                { "Fully approved", TimesheetWorkflowTestFixture.createCompletedWorkflowScenario() },
                { "Modification requested", TimesheetWorkflowTestFixture.createRequiresModificationScenario() },
                { "Rejected", TimesheetWorkflowTestFixture.createRejectedScenario() }
            };
        }
        
        /**
         * Scenarios where timesheet can be resubmitted.
         * Business rule: Only MODIFICATION_REQUESTED allows resubmission.
         * REJECTED timesheets are terminal and require new timesheet creation.
         */
        public static Object[][] resubmittableScenarios() {
            return new Object[][] {
                { "Modification requested", TimesheetWorkflowTestFixture.createRequiresModificationScenario() }
            };
        }
        
        /**
         * Valid approval actions for different workflow states.
         * Format: { "description", timesheet, expectedAction, expectedNextState }
         */
        public static Object[][] validApprovalActions() {
            return new Object[][] {
                { "Submit draft for review", 
                  TimesheetWorkflowTestFixture.createDraftScenario(), 
                  ApprovalAction.SUBMIT_FOR_APPROVAL,
                  "should be awaiting tutor review" },
                  
                { "Tutor approves timesheet", 
                  TimesheetWorkflowTestFixture.createPendingApprovalScenario(), 
                  ApprovalAction.APPROVE,
                  "should be tutor approved" },
                  
                { "HR gives final approval", 
                  TimesheetWorkflowTestFixture.createReadyForHRScenario(), 
                  ApprovalAction.APPROVE,
                  "should be fully approved" },
                  
                { "Request modifications", 
                  TimesheetWorkflowTestFixture.createPendingApprovalScenario(), 
                  ApprovalAction.REQUEST_MODIFICATION,
                  "should require modifications" },
                  
                { "Reject timesheet", 
                  TimesheetWorkflowTestFixture.createPendingApprovalScenario(), 
                  ApprovalAction.REJECT,
                  "should be rejected" }
            };
        }
    }
    
    /**
     * Helper method to simulate workflow progression for testing.
     * 
     * This method helps test the complete workflow by simulating the progression
     * through different states without relying on specific implementation details.
     */
    public static Timesheet simulateWorkflowProgression(Timesheet timesheet, ApprovalAction action) {
        // This would typically use the actual ApprovalStateMachine, but for now
        // we simulate the expected behavior based on business rules
        
        ApprovalStatus currentStatus = timesheet.getStatus();
        ApprovalStatus nextStatus = determineNextStatus(currentStatus, action);
        
        timesheet.setStatus(nextStatus);
        return timesheet;
    }
    
    /**
     * Helper method to determine expected next status based on business rules.
     * This encapsulates the business logic for testing purposes.
     */
    private static ApprovalStatus determineNextStatus(ApprovalStatus current, ApprovalAction action) {
        switch (current) {
            case DRAFT:
                if (action == ApprovalAction.SUBMIT_FOR_APPROVAL) {
                    return ApprovalStatus.PENDING_TUTOR_REVIEW;
                }
                break;
                
            case PENDING_TUTOR_REVIEW:
                switch (action) {
                    case APPROVE: return ApprovalStatus.APPROVED_BY_TUTOR;
                    case REJECT: return ApprovalStatus.REJECTED;
                    case REQUEST_MODIFICATION: return ApprovalStatus.MODIFICATION_REQUESTED;
                }
                break;
                
            case APPROVED_BY_LECTURER_AND_TUTOR:
                switch (action) {
                    case APPROVE: return ApprovalStatus.FINAL_APPROVED;
                    case REJECT: return ApprovalStatus.REJECTED;
                    case REQUEST_MODIFICATION: return ApprovalStatus.MODIFICATION_REQUESTED;
                }
                break;
                
            case MODIFICATION_REQUESTED:
                if (action == ApprovalAction.SUBMIT_FOR_APPROVAL) {
                    return ApprovalStatus.PENDING_TUTOR_REVIEW;
                }
                break;
                
            case REJECTED:
                // REJECTED is terminal - no transitions allowed
                break;
        }
        
        throw new IllegalArgumentException("Invalid transition: " + current + " -> " + action);
    }
}
