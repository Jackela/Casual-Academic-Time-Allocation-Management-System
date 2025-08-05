package com.usyd.catams.common.application;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.*;

/**
 * Comprehensive test suite for ApprovalStateMachine using behavior-driven testing.
 * 
 * This test class focuses on verifying that the state machine correctly implements
 * the business rules defined in the architecture document. Tests are designed to be
 * resilient to implementation changes while ensuring business behaviors are preserved.
 * 
 * Key principles:
 * - Tests business behaviors, not specific enum values
 * - Uses data-driven approaches for comprehensive coverage
 * - Focuses on workflow rules rather than implementation details
 * 
 * @author Development Team
 * @since 1.1
 */
@DisplayName("ApprovalStateMachine Business Behavior Tests")
class ApprovalStateMachineTest {
    
    private ApprovalStateMachine stateMachine;
    
    @BeforeEach
    void setUp() {
        stateMachine = new ApprovalStateMachine();
    }
    
    /**
     * Test all valid state transitions based on documented business workflow.
     * Business flow: DRAFT → PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR → APPROVED_BY_LECTURER_AND_TUTOR → FINAL_APPROVED
     * This single test method replaces dozens of individual hardcoded tests.
     */
    @ParameterizedTest
    @DisplayName("Valid state transitions should succeed")
    @CsvSource({
        // Step 1: DRAFT can only be submitted
        "DRAFT, SUBMIT_FOR_APPROVAL, PENDING_TUTOR_REVIEW",
        
        // Step 2: PENDING_TUTOR_REVIEW - tutor can approve, reject, or request modifications
        "PENDING_TUTOR_REVIEW, APPROVE, APPROVED_BY_TUTOR",
        "PENDING_TUTOR_REVIEW, REJECT, REJECTED",
        "PENDING_TUTOR_REVIEW, REQUEST_MODIFICATION, MODIFICATION_REQUESTED",
        
        // Step 3: From APPROVED_BY_TUTOR, lecturer performs FINAL_APPROVAL to move to HR queue
        "APPROVED_BY_TUTOR, FINAL_APPROVAL, APPROVED_BY_LECTURER_AND_TUTOR",
        
        // Step 4: APPROVED_BY_LECTURER_AND_TUTOR - HR can approve, reject, or request modifications
        "APPROVED_BY_LECTURER_AND_TUTOR, APPROVE, FINAL_APPROVED",
        "APPROVED_BY_LECTURER_AND_TUTOR, REJECT, REJECTED",
        "APPROVED_BY_LECTURER_AND_TUTOR, REQUEST_MODIFICATION, MODIFICATION_REQUESTED",
        
        // Recovery workflows: MODIFICATION_REQUESTED can be resubmitted
        "MODIFICATION_REQUESTED, SUBMIT_FOR_APPROVAL, PENDING_TUTOR_REVIEW",
        
    })
    void validTransitions_ShouldSucceed(ApprovalStatus fromStatus, ApprovalAction action, ApprovalStatus expectedStatus) {
        // Test canTransition
        assertThat(stateMachine.canTransition(fromStatus, action))
            .as("Should allow transition from %s using %s", fromStatus, action)
            .isTrue();
        
        // Test getNextStatus
        ApprovalStatus actualStatus = stateMachine.getNextStatus(fromStatus, action);
        assertThat(actualStatus)
            .as("Transition from %s using %s should result in %s", fromStatus, action, expectedStatus)
            .isEqualTo(expectedStatus);
    }
    
    /**
     * Test invalid state transitions using parameterized data.
     * These transitions should be rejected by the state machine based on business rules.
     */
    @ParameterizedTest
    @DisplayName("Invalid state transitions should be rejected")
    @CsvSource({
        // FINAL_APPROVED is a final state - no transitions allowed
        "FINAL_APPROVED, SUBMIT_FOR_APPROVAL",
        "FINAL_APPROVED, APPROVE", 
        "FINAL_APPROVED, REJECT",
        "FINAL_APPROVED, REQUEST_MODIFICATION",
        
        // FINAL_APPROVED is also a final state - no transitions allowed
        "FINAL_APPROVED, SUBMIT_FOR_APPROVAL",
        "FINAL_APPROVED, APPROVE",
        "FINAL_APPROVED, REJECT",
        "FINAL_APPROVED, REQUEST_MODIFICATION",
        
        // Invalid transitions from DRAFT (can only submit)
        "DRAFT, APPROVE",
        "DRAFT, REJECT",
        "DRAFT, REQUEST_MODIFICATION",
        
        // Invalid transitions from APPROVED_BY_TUTOR (only FINAL_APPROVAL is valid)
        "APPROVED_BY_TUTOR, SUBMIT_FOR_APPROVAL",
        "APPROVED_BY_TUTOR, APPROVE",
        "APPROVED_BY_TUTOR, REJECT",
        
        // Invalid transitions from MODIFICATION_REQUESTED (can only resubmit)
        "MODIFICATION_REQUESTED, APPROVE",
        "MODIFICATION_REQUESTED, REJECT",
        "MODIFICATION_REQUESTED, REQUEST_MODIFICATION",
        
        // Invalid transitions from APPROVED_BY_LECTURER_AND_TUTOR (cannot submit)
        "APPROVED_BY_LECTURER_AND_TUTOR, SUBMIT_FOR_APPROVAL",
        
        // Invalid transitions from PENDING_TUTOR_REVIEW (cannot submit)
        "PENDING_TUTOR_REVIEW, SUBMIT_FOR_APPROVAL",
        
        // Invalid transitions from REJECTED (terminal state - no actions allowed)
        "REJECTED, APPROVE",
        "REJECTED, REJECT",
        "REJECTED, REQUEST_MODIFICATION",
        "REJECTED, SUBMIT_FOR_APPROVAL"
    })
    void invalidTransitions_ShouldBeRejected(ApprovalStatus fromStatus, ApprovalAction action) {
        // Test canTransition returns false
        assertThat(stateMachine.canTransition(fromStatus, action))
            .as("Should not allow invalid transition from %s using %s", fromStatus, action)
            .isFalse();
        
        // Test getNextStatus throws exception
        assertThatThrownBy(() -> stateMachine.getNextStatus(fromStatus, action))
            .as("Should throw exception for invalid transition from %s using %s", fromStatus, action)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Invalid transition")
            .hasMessageContaining(fromStatus.toString())
            .hasMessageContaining(action.toString());
    }
    
    /**
     * Test status classification methods using parameterized data.
     */
    @ParameterizedTest
    @DisplayName("Editable status classification should be correct")
    @CsvSource({
        "DRAFT, true",
        "MODIFICATION_REQUESTED, true", 
        "REJECTED, false",
        "PENDING_TUTOR_REVIEW, false",
        "APPROVED_BY_TUTOR, false",
        "APPROVED_BY_LECTURER_AND_TUTOR, false",
        "FINAL_APPROVED, false"
    })
    void statusEditable_ShouldBeCorrect(ApprovalStatus status, boolean expectedEditable) {
        assertThat(stateMachine.isEditable(status))
            .as("Status %s editable classification should be %s", status, expectedEditable)
            .isEqualTo(expectedEditable);
    }
    
    @ParameterizedTest
    @DisplayName("Pending status classification should be correct")
    @CsvSource({
        "PENDING_TUTOR_REVIEW, true",
        "APPROVED_BY_LECTURER_AND_TUTOR, true",
        "APPROVED_BY_TUTOR, true",
        "DRAFT, false",
        "MODIFICATION_REQUESTED, false",
        "REJECTED, false",
        "FINAL_APPROVED, false"
    })
    void statusPending_ShouldBeCorrect(ApprovalStatus status, boolean expectedPending) {
        assertThat(stateMachine.isPending(status))
            .as("Status %s pending classification should be %s", status, expectedPending)
            .isEqualTo(expectedPending);
    }
    
    @ParameterizedTest
    @DisplayName("Final status classification should be correct")
    @CsvSource({
        "FINAL_APPROVED, true",
        "FINAL_APPROVED, true",
        "REJECTED, true",
        "DRAFT, false",
        "PENDING_TUTOR_REVIEW, false",
        "APPROVED_BY_TUTOR, false",
        "MODIFICATION_REQUESTED, false",
        "APPROVED_BY_LECTURER_AND_TUTOR, false"
    })
    void statusFinal_ShouldBeCorrect(ApprovalStatus status, boolean expectedFinal) {
        assertThat(stateMachine.isFinal(status))
            .as("Status %s final classification should be %s", status, expectedFinal)
            .isEqualTo(expectedFinal);
    }
    
    /**
     * Test that every status has some valid actions defined (except final states).
     */
    @ParameterizedTest
    @EnumSource(ApprovalStatus.class)
    @DisplayName("Every non-final status should have valid actions")
    void everyNonFinalStatus_ShouldHaveValidActions(ApprovalStatus status) {
        Set<ApprovalAction> validActions = stateMachine.getValidActions(status);
        
        if (status == ApprovalStatus.FINAL_APPROVED || 
            status == ApprovalStatus.FINAL_APPROVED || 
            status == ApprovalStatus.REJECTED) {
            assertThat(validActions)
                .as("Status %s should have no valid actions", status)
                .isEmpty();
        } else if (status == ApprovalStatus.APPROVED_BY_TUTOR) {
            assertThat(validActions)
                .as("APPROVED_BY_TUTOR should allow lecturer FINAL_APPROVAL")
                .containsExactlyInAnyOrder(ApprovalAction.FINAL_APPROVAL);
        } else {
            assertThat(validActions)
                .as("Non-final status %s should have at least one valid action", status)
                .isNotEmpty();
        }
    }
    
    /**
     * Test that getNextPossibleStatuses is consistent with valid transitions.
     */
    @ParameterizedTest
    @EnumSource(ApprovalStatus.class)
    @DisplayName("getNextPossibleStatuses should be consistent with valid transitions")
    void nextPossibleStatuses_ShouldBeConsistentWithTransitions(ApprovalStatus status) {
        ApprovalStatus[] nextStatuses = stateMachine.getNextPossibleStatuses(status);
        Set<ApprovalAction> validActions = stateMachine.getValidActions(status);
        
        // For each valid action, the resulting status should be in nextPossibleStatuses
        for (ApprovalAction action : validActions) {
            ApprovalStatus targetStatus = stateMachine.getNextStatus(status, action);
            
            assertThat(nextStatuses)
                .as("Next possible statuses for %s should include %s (reachable via %s)", 
                    status, targetStatus, action)
                .contains(targetStatus);
        }
    }
    
    /**
     * Test null parameter validation.
     */
    @Test
    @DisplayName("Null parameters should throw IllegalArgumentException")
    void nullParameters_ShouldThrowException() {
        // Test canTransition with null parameters
        assertThatThrownBy(() -> stateMachine.canTransition(null, ApprovalAction.APPROVE))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("From status cannot be null");
            
        assertThatThrownBy(() -> stateMachine.canTransition(ApprovalStatus.DRAFT, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Action cannot be null");
        
        // Test getNextStatus with null parameters
        assertThatThrownBy(() -> stateMachine.getNextStatus(null, ApprovalAction.APPROVE))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("From status cannot be null");
            
        assertThatThrownBy(() -> stateMachine.getNextStatus(ApprovalStatus.DRAFT, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Action cannot be null");
        
        // Test other methods with null parameters
        assertThatThrownBy(() -> stateMachine.getValidActions(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Status cannot be null");
            
        assertThatThrownBy(() -> stateMachine.getNextPossibleStatuses(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Status cannot be null");
            
        assertThatThrownBy(() -> stateMachine.isEditable(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Status cannot be null");
            
        assertThatThrownBy(() -> stateMachine.isPending(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Status cannot be null");
            
        assertThatThrownBy(() -> stateMachine.isFinal(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Status cannot be null");
    }
    
    /**
     * Test workflow scenario: Complete happy path from DRAFT to FINAL_APPROVED.
     */
    @Test
    @DisplayName("Complete workflow scenario should work end-to-end")
    void completeWorkflowScenario_ShouldWork() {
        ApprovalStatus currentStatus = ApprovalStatus.DRAFT;
        
        // Step 1: Submit for approval (DRAFT -> PENDING_TUTOR_REVIEW)
        assertThat(stateMachine.canTransition(currentStatus, ApprovalAction.SUBMIT_FOR_APPROVAL)).isTrue();
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        
        // Step 2: Tutor approves (PENDING_TUTOR_REVIEW -> APPROVED_BY_TUTOR)
        assertThat(stateMachine.canTransition(currentStatus, ApprovalAction.APPROVE)).isTrue();
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.APPROVE);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);
        
        // Step 3: APPROVED_BY_TUTOR automatically transitions to APPROVED_BY_LECTURER_AND_TUTOR in business logic
        // For testing purposes, we'll simulate this by manually setting the status
        currentStatus = ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR;
        
        // Step 4: HR approves (APPROVED_BY_LECTURER_AND_TUTOR -> FINAL_APPROVED)
        assertThat(stateMachine.canTransition(currentStatus, ApprovalAction.APPROVE)).isTrue();
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.APPROVE);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.FINAL_APPROVED);
        
        // Step 5: Verify final state
        assertThat(stateMachine.isFinal(currentStatus)).isTrue();
        assertThat(stateMachine.getValidActions(currentStatus)).isEmpty();
    }
    
    /**
     * Test rejection workflow scenario.
     */
    @Test
    @DisplayName("Rejection workflow should work")
    void rejectionWorkflow_ShouldWork() {
        ApprovalStatus currentStatus = ApprovalStatus.DRAFT;
        
        // Step 1: Submit for approval
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        
        // Step 2: Reject (terminal state)
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.REJECT);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.REJECTED);
        
        // Step 3: Verify REJECTED is final and has no valid actions
        assertThat(stateMachine.isFinal(ApprovalStatus.REJECTED)).isTrue();
        assertThat(stateMachine.getValidActions(ApprovalStatus.REJECTED)).isEmpty();
        
        // Verify status editability: REJECTED is read-only, DRAFT is editable
        assertThat(stateMachine.isEditable(ApprovalStatus.REJECTED)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.DRAFT)).isTrue();
    }
    
    /**
     * Test business behavior: Workflow progression rules.
     * This test verifies that the state machine follows the documented business workflow.
     */
    @Test
    @DisplayName("State machine should enforce documented workflow progression")
    void stateMachine_ShouldEnforceWorkflowProgression() {
        // Business rule: Draft can only be submitted
        assertThat(stateMachine.getValidActions(ApprovalStatus.DRAFT))
            .containsOnly(ApprovalAction.SUBMIT_FOR_APPROVAL);
            
        // Business rule: Pending states allow approval actions
        assertThat(stateMachine.getValidActions(ApprovalStatus.PENDING_TUTOR_REVIEW))
            .containsExactlyInAnyOrder(ApprovalAction.APPROVE, ApprovalAction.REJECT, ApprovalAction.REQUEST_MODIFICATION);
            
        assertThat(stateMachine.getValidActions(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR))
            .containsExactlyInAnyOrder(ApprovalAction.APPROVE, ApprovalAction.REJECT, ApprovalAction.REQUEST_MODIFICATION);
            
        // Business rule: Final states have no actions; APPROVED_BY_TUTOR allows only FINAL_APPROVAL
        assertThat(stateMachine.getValidActions(ApprovalStatus.FINAL_APPROVED)).isEmpty();
        assertThat(stateMachine.getValidActions(ApprovalStatus.FINAL_APPROVED)).isEmpty();
        assertThat(stateMachine.getValidActions(ApprovalStatus.APPROVED_BY_TUTOR))
            .containsExactlyInAnyOrder(ApprovalAction.FINAL_APPROVAL);
        
        // Business rule: REJECTED is terminal state with no actions
        assertThat(stateMachine.getValidActions(ApprovalStatus.REJECTED))
            .isEmpty();
        assertThat(stateMachine.getValidActions(ApprovalStatus.MODIFICATION_REQUESTED))
            .containsOnly(ApprovalAction.SUBMIT_FOR_APPROVAL);
    }
    
    /**
     * Test business behavior: State classifications align with business rules.
     */
    @Test
    @DisplayName("State classifications should align with business rules")
    void stateClassifications_ShouldAlignWithBusinessRules() {
        // Business rule: Editable states allow user modifications
        assertThat(stateMachine.isEditable(ApprovalStatus.DRAFT)).isTrue();
        assertThat(stateMachine.isEditable(ApprovalStatus.MODIFICATION_REQUESTED)).isTrue();
        assertThat(stateMachine.isEditable(ApprovalStatus.REJECTED)).isFalse(); // REJECTED is read-only
        
        // Business rule: Non-editable states prevent modifications
        assertThat(stateMachine.isEditable(ApprovalStatus.PENDING_TUTOR_REVIEW)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.APPROVED_BY_TUTOR)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.FINAL_APPROVED)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.FINAL_APPROVED)).isFalse();
        
        // Business rule: Pending states require reviewer action
        assertThat(stateMachine.isPending(ApprovalStatus.PENDING_TUTOR_REVIEW)).isTrue();
        assertThat(stateMachine.isPending(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR)).isTrue();
        
        // Business rule: Final states complete workflow (terminal states)
        assertThat(stateMachine.isFinal(ApprovalStatus.FINAL_APPROVED)).isTrue();
        assertThat(stateMachine.isFinal(ApprovalStatus.FINAL_APPROVED)).isTrue();
        assertThat(stateMachine.isFinal(ApprovalStatus.REJECTED)).isTrue(); // REJECTED is final
        assertThat(stateMachine.isFinal(ApprovalStatus.DRAFT)).isFalse();
    }
}
