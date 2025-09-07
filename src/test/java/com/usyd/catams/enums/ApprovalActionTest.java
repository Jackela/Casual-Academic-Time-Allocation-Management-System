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
        assertEquals(ApprovalStatus.PENDING_TUTOR_CONFIRMATION, result);
        
        result = ApprovalAction.TUTOR_CONFIRM.getTargetStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        assertEquals(ApprovalStatus.TUTOR_CONFIRMED, result);
        
        result = ApprovalAction.HR_CONFIRM.getTargetStatus(ApprovalStatus.LECTURER_CONFIRMED);
        assertEquals(ApprovalStatus.FINAL_CONFIRMED, result);
    }

    @Test
    @DisplayName("getTargetStatus should throw exception for invalid transitions")
    void getTargetStatus_ShouldThrowExceptionForInvalidTransitions() {
        // Test that invalid transitions throw exceptions (delegated to state machine)
        assertThrows(IllegalStateException.class, () -> {
            ApprovalAction.TUTOR_CONFIRM.getTargetStatus(ApprovalStatus.DRAFT);
        });
        
        assertThrows(IllegalStateException.class, () -> {
            ApprovalAction.SUBMIT_FOR_APPROVAL.getTargetStatus(ApprovalStatus.FINAL_CONFIRMED);
        });
    }

    @Test
    @DisplayName("LECTURER should be able to perform submission and confirmation actions")
    void lecturerShouldPerformSubmissionAndConfirmationActions() {
        // Based on confirmation workflow: Lecturers can submit and provide lecturer confirmation
        assertTrue(ApprovalAction.SUBMIT_FOR_APPROVAL.canBePerformedByLecturer());
        assertTrue(ApprovalAction.LECTURER_CONFIRM.canBePerformedByLecturer());
        assertTrue(ApprovalAction.REJECT.canBePerformedByLecturer());
        assertTrue(ApprovalAction.REQUEST_MODIFICATION.canBePerformedByLecturer());
        
        // Lecturers cannot perform tutor-specific confirmation
        assertFalse(ApprovalAction.TUTOR_CONFIRM.canBePerformedByLecturer());
        assertFalse(ApprovalAction.HR_CONFIRM.canBePerformedByLecturer());
    }

    @Test
    @DisplayName("TUTOR should be able to perform SUBMIT_FOR_APPROVAL and TUTOR_CONFIRM actions")
    void tutorShouldPerformReviewActions() {
        // Based on confirmation workflow: Tutors can submit their own timesheets and confirm assigned timesheets
        assertTrue(ApprovalAction.SUBMIT_FOR_APPROVAL.canBePerformedByTutor());
        assertTrue(ApprovalAction.TUTOR_CONFIRM.canBePerformedByTutor());
        
        // Tutors cannot perform these actions - they only confirm, don't reject/modify
        assertFalse(ApprovalAction.REJECT.canBePerformedByTutor());
        assertFalse(ApprovalAction.REQUEST_MODIFICATION.canBePerformedByTutor());
        assertFalse(ApprovalAction.LECTURER_CONFIRM.canBePerformedByTutor());
        assertFalse(ApprovalAction.HR_CONFIRM.canBePerformedByTutor());
    }

    @Test
    @DisplayName("ADMIN should be able to perform all actions")
    void adminShouldPerformAllActions() {
        assertTrue(ApprovalAction.TUTOR_CONFIRM.canBePerformedByAdmin());
        assertTrue(ApprovalAction.REJECT.canBePerformedByAdmin());
        assertTrue(ApprovalAction.SUBMIT_FOR_APPROVAL.canBePerformedByAdmin());
        assertTrue(ApprovalAction.REQUEST_MODIFICATION.canBePerformedByAdmin());
    }
}
