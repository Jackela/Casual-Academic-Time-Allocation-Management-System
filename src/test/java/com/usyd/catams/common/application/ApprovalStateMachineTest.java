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
     * Business flow: DRAFT → PENDING_TUTOR_CONFIRMATION → TUTOR_CONFIRMED → LECTURER_CONFIRMED → FINAL_CONFIRMED
     * This single test method replaces dozens of individual hardcoded tests.
     */
    @ParameterizedTest
    @DisplayName("Valid state transitions should succeed")
    @CsvSource({
        // Step 1: DRAFT can only be submitted
        "DRAFT, SUBMIT_FOR_APPROVAL, PENDING_TUTOR_CONFIRMATION",
        
        // Step 2: PENDING_TUTOR_CONFIRMATION - tutor can confirm, reject, or request modifications
        "PENDING_TUTOR_CONFIRMATION, TUTOR_CONFIRM, TUTOR_CONFIRMED",
        "PENDING_TUTOR_CONFIRMATION, REJECT, REJECTED",
        "PENDING_TUTOR_CONFIRMATION, REQUEST_MODIFICATION, MODIFICATION_REQUESTED",
        
        // Step 3: From TUTOR_CONFIRMED, lecturer performs FINAL_APPROVAL to move to HR queue
        "TUTOR_CONFIRMED, LECTURER_CONFIRM, LECTURER_CONFIRMED",
        
        // Step 4: LECTURER_CONFIRMED - HR can confirm, reject, or request modifications
        "LECTURER_CONFIRMED, HR_CONFIRM, FINAL_CONFIRMED",
        "LECTURER_CONFIRMED, REJECT, REJECTED",
        "LECTURER_CONFIRMED, REQUEST_MODIFICATION, MODIFICATION_REQUESTED",
        
        // Recovery workflows: MODIFICATION_REQUESTED and REJECTED can be resubmitted
        "MODIFICATION_REQUESTED, SUBMIT_FOR_APPROVAL, PENDING_TUTOR_CONFIRMATION",
        "REJECTED, SUBMIT_FOR_APPROVAL, PENDING_TUTOR_CONFIRMATION",
        
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
        // FINAL_CONFIRMED is a final state - no transitions allowed
        "FINAL_CONFIRMED, SUBMIT_FOR_APPROVAL",
        "FINAL_CONFIRMED, TUTOR_CONFIRM", 
        "FINAL_CONFIRMED, REJECT",
        "FINAL_CONFIRMED, REQUEST_MODIFICATION",
        
        // Invalid transitions from DRAFT (can only submit)
        "DRAFT, TUTOR_CONFIRM",
        "DRAFT, LECTURER_CONFIRM",
        "DRAFT, HR_CONFIRM",
        "DRAFT, REJECT",
        "DRAFT, REQUEST_MODIFICATION",
        
        // Invalid transitions from TUTOR_CONFIRMED (only LECTURER_CONFIRM and REJECT are valid)
        "TUTOR_CONFIRMED, SUBMIT_FOR_APPROVAL",
        "TUTOR_CONFIRMED, TUTOR_CONFIRM",
        "TUTOR_CONFIRMED, HR_CONFIRM",
        
        // Invalid transitions from MODIFICATION_REQUESTED (can only resubmit)
        "MODIFICATION_REQUESTED, TUTOR_CONFIRM",
        "MODIFICATION_REQUESTED, LECTURER_CONFIRM", 
        "MODIFICATION_REQUESTED, HR_CONFIRM",
        "MODIFICATION_REQUESTED, REJECT",
        "MODIFICATION_REQUESTED, REQUEST_MODIFICATION",
        
        // Invalid transitions from LECTURER_CONFIRMED (cannot submit)
        "LECTURER_CONFIRMED, SUBMIT_FOR_APPROVAL",
        
        // Invalid transitions from PENDING_TUTOR_CONFIRMATION (cannot submit)
        "PENDING_TUTOR_CONFIRMATION, SUBMIT_FOR_APPROVAL",
        
        // Invalid transitions from REJECTED (can only resubmit, other actions not allowed)
        "REJECTED, TUTOR_CONFIRM",
        "REJECTED, LECTURER_CONFIRM",
        "REJECTED, HR_CONFIRM",
        "REJECTED, REJECT",
        "REJECTED, REQUEST_MODIFICATION"
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
        "REJECTED, true",
        "PENDING_TUTOR_CONFIRMATION, false",
        "TUTOR_CONFIRMED, false",
        "LECTURER_CONFIRMED, false",
        "FINAL_CONFIRMED, false"
    })
    void statusEditable_ShouldBeCorrect(ApprovalStatus status, boolean expectedEditable) {
        assertThat(stateMachine.isEditable(status))
            .as("Status %s editable classification should be %s", status, expectedEditable)
            .isEqualTo(expectedEditable);
    }
    
    @ParameterizedTest
    @DisplayName("Pending status classification should be correct")
    @CsvSource({
        "PENDING_TUTOR_CONFIRMATION, true",
        "LECTURER_CONFIRMED, true",
        "TUTOR_CONFIRMED, true",
        "DRAFT, false",
        "MODIFICATION_REQUESTED, false",
        "REJECTED, false",
        "FINAL_CONFIRMED, false"
    })
    void statusPending_ShouldBeCorrect(ApprovalStatus status, boolean expectedPending) {
        assertThat(stateMachine.isPending(status))
            .as("Status %s pending classification should be %s", status, expectedPending)
            .isEqualTo(expectedPending);
    }
    
    @ParameterizedTest
    @DisplayName("Final status classification should be correct")
    @CsvSource({
        "FINAL_CONFIRMED, true",
        "REJECTED, false",
        "DRAFT, false",
        "PENDING_TUTOR_CONFIRMATION, false",
        "TUTOR_CONFIRMED, false",
        "MODIFICATION_REQUESTED, false",
        "LECTURER_CONFIRMED, false"
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
        
        if (status == ApprovalStatus.FINAL_CONFIRMED) {
            assertThat(validActions)
                .as("Status %s should have no valid actions", status)
                .isEmpty();
        } else if (status == ApprovalStatus.TUTOR_CONFIRMED) {
            assertThat(validActions)
                .as("TUTOR_CONFIRMED should allow lecturer CONFIRM, REJECT, and REQUEST_MODIFICATION")
                .containsExactlyInAnyOrder(ApprovalAction.LECTURER_CONFIRM, ApprovalAction.REJECT, ApprovalAction.REQUEST_MODIFICATION);
        } else if (status == ApprovalStatus.REJECTED || status == ApprovalStatus.MODIFICATION_REQUESTED) {
            assertThat(validActions)
                .as("Status %s should allow resubmission", status)
                .containsOnly(ApprovalAction.SUBMIT_FOR_APPROVAL);
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
        assertThatThrownBy(() -> stateMachine.canTransition(null, ApprovalAction.TUTOR_CONFIRM))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("From status cannot be null");
            
        assertThatThrownBy(() -> stateMachine.canTransition(ApprovalStatus.DRAFT, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Action cannot be null");
        
        // Test getNextStatus with null parameters
        assertThatThrownBy(() -> stateMachine.getNextStatus(null, ApprovalAction.TUTOR_CONFIRM))
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
     * Test workflow scenario: Complete happy path from DRAFT to FINAL_CONFIRMED.
     */
    @Test
    @DisplayName("Complete workflow scenario should work end-to-end")
    void completeWorkflowScenario_ShouldWork() {
        ApprovalStatus currentStatus = ApprovalStatus.DRAFT;
        
        // Step 1: Submit for approval (DRAFT -> PENDING_TUTOR_CONFIRMATION)
        assertThat(stateMachine.canTransition(currentStatus, ApprovalAction.SUBMIT_FOR_APPROVAL)).isTrue();
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        
        // Step 2: Tutor approves (PENDING_TUTOR_CONFIRMATION -> TUTOR_CONFIRMED)
        assertThat(stateMachine.canTransition(currentStatus, ApprovalAction.TUTOR_CONFIRM)).isTrue();
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.TUTOR_CONFIRM);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.TUTOR_CONFIRMED);
        
        // Step 3: TUTOR_CONFIRMED automatically transitions to LECTURER_CONFIRMED in business logic
        // For testing purposes, we'll simulate this by manually setting the status
        currentStatus = ApprovalStatus.LECTURER_CONFIRMED;
        
        // Step 4: HR confirms (LECTURER_CONFIRMED -> FINAL_CONFIRMED)
        assertThat(stateMachine.canTransition(currentStatus, ApprovalAction.HR_CONFIRM)).isTrue();
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.HR_CONFIRM);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.FINAL_CONFIRMED);
        
        // Step 5: Verify final state
        assertThat(stateMachine.isFinal(currentStatus)).isTrue();
        assertThat(stateMachine.getValidActions(currentStatus)).isEmpty();
    }
    
    /**
     * Test rejection workflow scenario with resubmission capability.
     */
    @Test
    @DisplayName("Rejection workflow should work")
    void rejectionWorkflow_ShouldWork() {
        ApprovalStatus currentStatus = ApprovalStatus.DRAFT;
        
        // Step 1: Submit for approval
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        
        // Step 2: Reject (allows corrections and resubmission)
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.REJECT);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.REJECTED);
        
        // Step 3: Verify REJECTED allows resubmission after corrections
        assertThat(stateMachine.isFinal(ApprovalStatus.REJECTED)).isFalse();
        assertThat(stateMachine.getValidActions(ApprovalStatus.REJECTED))
            .containsOnly(ApprovalAction.SUBMIT_FOR_APPROVAL);
        
        // Verify status editability: REJECTED is editable, DRAFT is editable
        assertThat(stateMachine.isEditable(ApprovalStatus.REJECTED)).isTrue();
        assertThat(stateMachine.isEditable(ApprovalStatus.DRAFT)).isTrue();
        
        // Step 4: Verify rejected timesheet can be resubmitted
        currentStatus = stateMachine.getNextStatus(currentStatus, ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(currentStatus).isEqualTo(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
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
        assertThat(stateMachine.getValidActions(ApprovalStatus.PENDING_TUTOR_CONFIRMATION))
            .containsExactlyInAnyOrder(ApprovalAction.TUTOR_CONFIRM, ApprovalAction.REJECT, ApprovalAction.REQUEST_MODIFICATION);
            
        assertThat(stateMachine.getValidActions(ApprovalStatus.LECTURER_CONFIRMED))
            .containsExactlyInAnyOrder(ApprovalAction.HR_CONFIRM, ApprovalAction.REJECT, ApprovalAction.REQUEST_MODIFICATION);
            
        // Business rule: FINAL_CONFIRMED is terminal state with no actions
        assertThat(stateMachine.getValidActions(ApprovalStatus.FINAL_CONFIRMED)).isEmpty();
        
        // Business rule: TUTOR_CONFIRMED allows LECTURER_CONFIRM, REJECT and REQUEST_MODIFICATION per SSOT
        assertThat(stateMachine.getValidActions(ApprovalStatus.TUTOR_CONFIRMED))
            .containsExactlyInAnyOrder(ApprovalAction.LECTURER_CONFIRM, ApprovalAction.REJECT, ApprovalAction.REQUEST_MODIFICATION);
        
        // Business rule: REJECTED allows resubmission after corrections
        assertThat(stateMachine.getValidActions(ApprovalStatus.REJECTED))
            .containsOnly(ApprovalAction.SUBMIT_FOR_APPROVAL);
        
        // Business rule: MODIFICATION_REQUESTED allows resubmission
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
        assertThat(stateMachine.isEditable(ApprovalStatus.REJECTED)).isTrue(); // REJECTED allows corrections and resubmission
        
        // Business rule: Non-editable states prevent modifications
        assertThat(stateMachine.isEditable(ApprovalStatus.PENDING_TUTOR_CONFIRMATION)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.TUTOR_CONFIRMED)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.LECTURER_CONFIRMED)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.FINAL_CONFIRMED)).isFalse();
        assertThat(stateMachine.isEditable(ApprovalStatus.FINAL_CONFIRMED)).isFalse();
        
        // Business rule: Pending states require reviewer action
        assertThat(stateMachine.isPending(ApprovalStatus.PENDING_TUTOR_CONFIRMATION)).isTrue();
        assertThat(stateMachine.isPending(ApprovalStatus.LECTURER_CONFIRMED)).isTrue();
        
        // Business rule: Only FINAL_CONFIRMED is a terminal state
        assertThat(stateMachine.isFinal(ApprovalStatus.FINAL_CONFIRMED)).isTrue();
        
        // Business rule: REJECTED allows resubmission, so it's not a terminal state
        assertThat(stateMachine.isFinal(ApprovalStatus.REJECTED)).isFalse();
        assertThat(stateMachine.isFinal(ApprovalStatus.DRAFT)).isFalse();
    }
}
