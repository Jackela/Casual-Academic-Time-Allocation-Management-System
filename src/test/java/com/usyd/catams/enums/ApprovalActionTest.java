package com.usyd.catams.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ApprovalAction enum.
 * 
 * Tests the approval action workflow transitions as specified in Story 2.1.
 */
class ApprovalActionTest {

    @Test
    @DisplayName("APPROVE action should transition PENDING_LECTURER_APPROVAL to APPROVED")
    void shouldTransitionPendingLecturerApprovalToApproved() {
        ApprovalAction action = ApprovalAction.APPROVE;
        ApprovalStatus currentStatus = ApprovalStatus.PENDING_LECTURER_APPROVAL;
        
        ApprovalStatus targetStatus = action.getTargetStatus(currentStatus);
        
        assertEquals(ApprovalStatus.APPROVED, targetStatus);
    }

    @Test
    @DisplayName("REJECT action should transition PENDING_LECTURER_APPROVAL to REJECTED")
    void shouldTransitionPendingLecturerApprovalToRejected() {
        ApprovalAction action = ApprovalAction.REJECT;
        ApprovalStatus currentStatus = ApprovalStatus.PENDING_LECTURER_APPROVAL;
        
        ApprovalStatus targetStatus = action.getTargetStatus(currentStatus);
        
        assertEquals(ApprovalStatus.REJECTED, targetStatus);
    }

    @Test
    @DisplayName("APPROVE action should fail on non-pending status")
    void shouldFailApproveOnNonPendingStatus() {
        ApprovalAction action = ApprovalAction.APPROVE;
        ApprovalStatus currentStatus = ApprovalStatus.DRAFT;
        
        assertThrows(IllegalArgumentException.class, () -> {
            action.getTargetStatus(currentStatus);
        });
    }

    @Test
    @DisplayName("REJECT action should fail on non-pending status")
    void shouldFailRejectOnNonPendingStatus() {
        ApprovalAction action = ApprovalAction.REJECT;
        ApprovalStatus currentStatus = ApprovalStatus.FINAL_APPROVED;
        
        assertThrows(IllegalArgumentException.class, () -> {
            action.getTargetStatus(currentStatus);
        });
    }

    @Test
    @DisplayName("LECTURER should be able to perform APPROVE and REJECT actions")
    void lecturerShouldPerformApproveAndReject() {
        assertTrue(ApprovalAction.APPROVE.canBePerformedByLecturer());
        assertTrue(ApprovalAction.REJECT.canBePerformedByLecturer());
    }

    @Test
    @DisplayName("TUTOR should not be able to perform APPROVE and REJECT actions")
    void tutorShouldNotPerformApproveAndReject() {
        assertFalse(ApprovalAction.APPROVE.canBePerformedByTutor());
        assertFalse(ApprovalAction.REJECT.canBePerformedByTutor());
    }

    @Test
    @DisplayName("ADMIN should be able to perform all actions")
    void adminShouldPerformAllActions() {
        assertTrue(ApprovalAction.APPROVE.canBePerformedByAdmin());
        assertTrue(ApprovalAction.REJECT.canBePerformedByAdmin());
        assertTrue(ApprovalAction.SUBMIT_FOR_APPROVAL.canBePerformedByAdmin());
    }
}