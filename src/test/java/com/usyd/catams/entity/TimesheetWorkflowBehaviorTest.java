package com.usyd.catams.entity;

import com.usyd.catams.test.fixture.TimesheetWorkflowTestFixture;
import com.usyd.catams.test.scenarios.WorkflowTestScenarios;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static com.usyd.catams.test.assertions.TimesheetAssertions.assertThat;

/**
 * Behavior-driven tests for Timesheet entity focusing on business behaviors
 * rather than implementation details.
 * 
 * This test class replaces hardcoded status assertions with business behavior
 * assertions that remain stable even when underlying implementation changes.
 * 
 * Key principles:
 * - Tests business behaviors, not internal state
 * - Uses semantic test fixture methods
 * - Focuses on what the system should do, not how it does it
 * - Resilient to implementation changes
 * 
 * @author Development Team
 * @since 1.1
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Timesheet Workflow Behavior Tests")
class TimesheetWorkflowBehaviorTest {
    
    /**
     * Test business behavior: Draft timesheets should be editable.
     * 
     * Business rule: Users can modify timesheets that haven't been submitted yet.
     */
    @Test
    @DisplayName("Draft timesheets should allow editing")
    void draftTimesheet_ShouldBeEditable() {
        Timesheet timesheet = TimesheetWorkflowTestFixture.createDraftScenario();
        
        assertThat(timesheet)
            .isEditable()
            .isDraft()
            .isNotPending()
            .cannotBeApproved();
    }
    
    /**
     * Test business behavior: Submitted timesheets await review.
     * 
     * Business rule: Once submitted, timesheets enter the approval workflow and become read-only.
     */
    @Test
    @DisplayName("Submitted timesheets should await tutor review")
    void submittedTimesheet_ShouldAwaitTutorReview() {
        Timesheet timesheet = TimesheetWorkflowTestFixture.createPendingApprovalScenario();
        
        assertThat(timesheet)
            .isNotEditable()
            .isAwaitingTutorReview()
            .isPending()
            .canBeApproved();
    }
    
    /**
     * Test business behavior: Approved timesheets progress to HR.
     * 
     * Business rule: After tutor approval, timesheets move to HR queue for final approval.
     */
    @Test
    @DisplayName("Tutor-approved timesheets should be ready for HR review")
    void tutorApprovedTimesheet_ShouldBeReadyForHR() {
        Timesheet timesheet = TimesheetWorkflowTestFixture.createReadyForHRScenario();
        
        assertThat(timesheet)
            .isNotEditable()
            .isReadyForHRReview()
            .isPending()
            .canBeApproved();
    }
    
    /**
     * Test business behavior: Final approved timesheets complete the workflow.
     * 
     * Business rule: Fully approved timesheets cannot be modified and are ready for payroll.
     */
    @Test
    @DisplayName("Fully approved timesheets should complete workflow")
    void fullyApprovedTimesheet_ShouldCompleteWorkflow() {
        Timesheet timesheet = TimesheetWorkflowTestFixture.createCompletedWorkflowScenario();
        
        assertThat(timesheet)
            .isNotEditable()
            .isFullyApproved()
            .isFinal()
            .cannotBeApproved();
    }
    
    /**
     * Test business behavior: Modification requests allow editing.
     * 
     * Business rule: When reviewers request modifications, timesheets become editable again.
     */
    @Test
    @DisplayName("Modification requested timesheets should allow editing")
    void modificationRequestedTimesheet_ShouldAllowEditing() {
        Timesheet timesheet = TimesheetWorkflowTestFixture.createRequiresModificationScenario();
        
        assertThat(timesheet)
            .isEditable()
            .requiresModification()
            .canBeResubmitted()
            .cannotBeApproved();
    }
    
    /**
     * Test business behavior: Rejected timesheets are terminal and read-only.
     * 
     * Business rule: Rejected timesheets are read-only terminal states that preserve audit trail.
     * To resubmit after rejection, lecturers must create a new timesheet.
     */
    @Test
    @DisplayName("Rejected timesheets should be read-only terminal states")
    void rejectedTimesheet_ShouldBeReadOnlyTerminal() {
        Timesheet timesheet = TimesheetWorkflowTestFixture.createRejectedScenario();
        
        assertThat(timesheet)
            .isNotEditable()
            .wasRejected()
            .isFinal()
            .cannotBeApproved();
    }
    
    /**
     * Parameterized test: Editable timesheets follow business rules.
     * 
     * Tests that all editable states allow the expected behaviors.
     */
    @ParameterizedTest(name = "{0} should be editable")
    @MethodSource("com.usyd.catams.test.scenarios.WorkflowTestScenarios$ParameterizedTestData#editableScenarios")
    @DisplayName("Editable timesheets should allow modifications")
    void editableTimesheets_ShouldAllowModifications(String description, Timesheet timesheet) {
        assertThat(timesheet)
            .isEditable()
            .cannotBeApproved()
            .isNotFinal();
    }
    
    /**
     * Parameterized test: Non-editable timesheets follow business rules.
     * 
     * Tests that all non-editable states prevent modifications as expected.
     */
    @ParameterizedTest(name = "{0} should not be editable")
    @MethodSource("com.usyd.catams.test.scenarios.WorkflowTestScenarios$ParameterizedTestData#nonEditableScenarios")
    @DisplayName("Non-editable timesheets should prevent modifications")
    void nonEditableTimesheets_ShouldPreventModifications(String description, Timesheet timesheet) {
        assertThat(timesheet).isNotEditable();
    }
    
    /**
     * Parameterized test: Approvable timesheets accept approval actions.
     * 
     * Tests that pending timesheets can be approved by authorized users.
     */
    @ParameterizedTest(name = "{0} should be approvable")
    @MethodSource("com.usyd.catams.test.scenarios.WorkflowTestScenarios$ParameterizedTestData#approvableScenarios")
    @DisplayName("Approvable timesheets should accept approval actions")
    void approvableTimesheets_ShouldAcceptApprovalActions(String description, Timesheet timesheet) {
        assertThat(timesheet)
            .canBeApproved()
            .isPending()
            .isNotEditable();
    }
    
    /**
     * Parameterized test: Non-approvable timesheets reject approval actions.
     * 
     * Tests that non-pending timesheets cannot be approved.
     */
    @ParameterizedTest(name = "{0} should not be approvable")
    @MethodSource("com.usyd.catams.test.scenarios.WorkflowTestScenarios$ParameterizedTestData#nonApprovableScenarios")
    @DisplayName("Non-approvable timesheets should reject approval actions")
    void nonApprovableTimesheets_ShouldRejectApprovalActions(String description, Timesheet timesheet) {
        assertThat(timesheet).cannotBeApproved();
    }
    
    /**
     * Test business behavior: Timesheet workflow progression.
     * 
     * Verifies that timesheets progress through the documented workflow stages correctly.
     */
    @Test
    @DisplayName("Timesheet should progress through workflow stages")
    void timesheet_ShouldProgressThroughWorkflowStages() {
        // Start with draft
        Timesheet timesheet = WorkflowTestScenarios.HappyPathWorkflow.startDraft();
        assertThat(timesheet).isDraft().isEditable();
        
        // Progress to submitted
        Timesheet submitted = WorkflowTestScenarios.HappyPathWorkflow.afterSubmission();
        assertThat(submitted).isAwaitingTutorReview().canBeApproved();
        
        // Progress to tutor approved
        Timesheet tutorApproved = WorkflowTestScenarios.HappyPathWorkflow.afterTutorApproval();
        assertThat(tutorApproved).isTutorApproved().cannotBeApproved();
        
        // Progress to HR queue
        Timesheet inHRQueue = WorkflowTestScenarios.HappyPathWorkflow.inHRQueue();
        assertThat(inHRQueue).isReadyForHRReview().canBeApproved();
        
        // Complete workflow
        Timesheet completed = WorkflowTestScenarios.HappyPathWorkflow.fullyCompleted();
        assertThat(completed).isFullyApproved().isFinal();
    }
    
    /**
     * Test business behavior: Approval actions produce expected outcomes.
     * 
     * Verifies that performing approval actions results in the correct business state.
     */
    @Test
    @DisplayName("Approval actions should produce expected business outcomes")
    void approvalActions_ShouldProduceExpectedBusinessOutcomes() {
        // Test submission
        Timesheet draft = TimesheetWorkflowTestFixture.createDraftScenario();
        Approval submission = draft.submitForApproval(WorkflowTestScenarios.LECTURER_ID);
        
        assertThat(draft).isAwaitingTutorReview().canBeApproved();
        org.assertj.core.api.Assertions.assertThat(submission).isNotNull();
        
        // Test approval - should become tutor-approved, then lecturer final approval moves to HR
        Timesheet pending = TimesheetWorkflowTestFixture.createPendingApprovalScenario();
        Approval tutorApproval = pending.approve(WorkflowTestScenarios.TUTOR_ID, "Looks good");
        org.assertj.core.api.Assertions.assertThat(tutorApproval).isNotNull();
        assertThat(pending).isTutorApproved().cannotBeApproved();
        
        // Lecturer performs final approval to move to HR queue
        pending.finalApprove(WorkflowTestScenarios.LECTURER_ID, "Final academic approval");
        assertThat(pending).isReadyForHRReview().canBeApproved();
        
        // Test rejection
        Timesheet forRejection = TimesheetWorkflowTestFixture.createPendingApprovalScenario();
        Approval rejection = forRejection.reject(WorkflowTestScenarios.TUTOR_ID, "Needs more detail");
        
        assertThat(forRejection).wasRejected().isFinal();
        org.assertj.core.api.Assertions.assertThat(rejection).isNotNull();
        
        // Test modification request
        Timesheet forModification = TimesheetWorkflowTestFixture.createPendingApprovalScenario();
        Approval modRequest = forModification.requestModification(WorkflowTestScenarios.TUTOR_ID, "Please add more hours breakdown");
        
        assertThat(forModification).requiresModification().canBeResubmitted();
        org.assertj.core.api.Assertions.assertThat(modRequest).isNotNull();
    }
    
    /**
     * Test business behavior: Invalid actions are prevented.
     * 
     * Verifies that the system prevents actions that violate business rules.
     */
    @Test
    @DisplayName("Invalid actions should be prevented")
    void invalidActions_ShouldBePrevented() {
        // Cannot approve draft timesheet
        Timesheet draft = TimesheetWorkflowTestFixture.createDraftScenario();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> 
            draft.approve(WorkflowTestScenarios.TUTOR_ID, "comment"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cannot be approved");
        
        // Cannot approve already completed timesheet
        Timesheet completed = TimesheetWorkflowTestFixture.createCompletedWorkflowScenario();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> 
            completed.approve(WorkflowTestScenarios.HR_ID, "comment"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cannot be approved");
        
        // Cannot approve intermediate state
        Timesheet tutorApproved = TimesheetWorkflowTestFixture.createTutorApprovedScenario();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> 
            tutorApproved.approve(WorkflowTestScenarios.HR_ID, "comment"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cannot be approved");
    }
}
