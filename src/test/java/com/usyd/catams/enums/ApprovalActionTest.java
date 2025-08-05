package com.usyd.catams.enums;

import com.usyd.catams.common.application.ApprovalStateMachine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ApprovalAction enum.
 * 
 * Tests the enum delegation to ApprovalStateMachine and role-based permissions.
 * Most workflow testing is now handled by ApprovalStateMachineTest.
 */
class ApprovalActionTest {
    
    private ApprovalStateMachine stateMachine;
    
    @BeforeEach
    void setUp() {
        stateMachine = new ApprovalStateMachine();
        // Initialize the static holder to test enum delegation
        ApprovalAction.StateMachineHolder.instance = stateMachine;
    }

    @Test
    @DisplayName("getTargetStatus should delegate to ApprovalStateMachine")
    void getTargetStatus_ShouldDelegateToStateMachine() {
        // Test valid transitions delegate to state machine
        ApprovalStatus result = ApprovalAction.SUBMIT_FOR_APPROVAL.getTargetStatus(ApprovalStatus.DRAFT);
        assertEquals(ApprovalStatus.PENDING_TUTOR_REVIEW, result);
        
        result = ApprovalAction.APPROVE.getTargetStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertEquals(ApprovalStatus.APPROVED_BY_TUTOR, result);
        
        result = ApprovalAction.APPROVE.getTargetStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
        assertEquals(ApprovalStatus.FINAL_APPROVED, result);
    }

    @Test
    @DisplayName("getTargetStatus should throw exception for invalid transitions")
    void getTargetStatus_ShouldThrowExceptionForInvalidTransitions() {
        // Test that invalid transitions throw exceptions (delegated to state machine)
        assertThrows(IllegalStateException.class, () -> {
            ApprovalAction.APPROVE.getTargetStatus(ApprovalStatus.DRAFT);
        });
        
        assertThrows(IllegalStateException.class, () -> {
            ApprovalAction.SUBMIT_FOR_APPROVAL.getTargetStatus(ApprovalStatus.FINAL_APPROVED);
        });
    }

    @Test
    @DisplayName("LECTURER should only be able to perform SUBMIT_FOR_APPROVAL action")
    void lecturerShouldOnlySubmitForApproval() {
        // Based on SSOT: Lecturers are creators, they can only submit for approval
        assertTrue(ApprovalAction.SUBMIT_FOR_APPROVAL.canBePerformedByLecturer());
        
        // Lecturers cannot perform approval/rejection actions
        assertFalse(ApprovalAction.APPROVE.canBePerformedByLecturer());
        assertFalse(ApprovalAction.REJECT.canBePerformedByLecturer());
        assertFalse(ApprovalAction.REQUEST_MODIFICATION.canBePerformedByLecturer());
    }

    @Test
    @DisplayName("TUTOR should be able to perform APPROVE, REJECT, and REQUEST_MODIFICATION actions")
    void tutorShouldPerformReviewActions() {
        // Based on SSOT: Tutors review timesheets created for them
        assertTrue(ApprovalAction.APPROVE.canBePerformedByTutor());
        assertTrue(ApprovalAction.REJECT.canBePerformedByTutor());
        assertTrue(ApprovalAction.REQUEST_MODIFICATION.canBePerformedByTutor());
        
        // Tutors cannot submit for approval (that's lecturer's role)
        assertFalse(ApprovalAction.SUBMIT_FOR_APPROVAL.canBePerformedByTutor());
    }

    @Test
    @DisplayName("ADMIN should be able to perform all actions")
    void adminShouldPerformAllActions() {
        assertTrue(ApprovalAction.APPROVE.canBePerformedByAdmin());
        assertTrue(ApprovalAction.REJECT.canBePerformedByAdmin());
        assertTrue(ApprovalAction.SUBMIT_FOR_APPROVAL.canBePerformedByAdmin());
        assertTrue(ApprovalAction.REQUEST_MODIFICATION.canBePerformedByAdmin());
    }
}
