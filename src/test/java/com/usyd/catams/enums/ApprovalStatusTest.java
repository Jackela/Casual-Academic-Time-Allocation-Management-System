package com.usyd.catams.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ApprovalStatus enum.
 * 
 * Tests the status transitions and business rules as specified in Story 2.1.
 */
class ApprovalStatusTest {

    @Test
    @DisplayName("APPROVED status should allow transition to PENDING_HR_REVIEW")
    void approvedShouldTransitionToPendingHrReview() {
        ApprovalStatus status = ApprovalStatus.APPROVED;
        
        assertTrue(status.canTransitionTo(ApprovalStatus.PENDING_HR_REVIEW));
    }

    @Test
    @DisplayName("APPROVED status should not be editable")
    void approvedShouldNotBeEditable() {
        ApprovalStatus status = ApprovalStatus.APPROVED;
        
        assertFalse(status.isEditable());
    }

    @Test
    @DisplayName("APPROVED status should not be final")
    void approvedShouldNotBeFinal() {
        ApprovalStatus status = ApprovalStatus.APPROVED;
        
        assertFalse(status.isFinal());
    }

    @Test
    @DisplayName("REJECTED status should be editable for resubmission")
    void rejectedShouldBeEditable() {
        ApprovalStatus status = ApprovalStatus.REJECTED;
        
        assertTrue(status.isEditable());
    }

    @Test
    @DisplayName("PENDING_LECTURER_APPROVAL should allow transitions to APPROVED and REJECTED")
    void pendingLecturerApprovalShouldAllowApprovedAndRejected() {
        ApprovalStatus status = ApprovalStatus.PENDING_LECTURER_APPROVAL;
        
        assertTrue(status.canTransitionTo(ApprovalStatus.APPROVED));
        assertTrue(status.canTransitionTo(ApprovalStatus.REJECTED));
    }

    @Test
    @DisplayName("Status parsing should work correctly")
    void statusParsingShouldWork() {
        assertEquals(ApprovalStatus.APPROVED, ApprovalStatus.fromValue("approved"));
        assertEquals(ApprovalStatus.REJECTED, ApprovalStatus.fromValue("rejected"));
        assertEquals(ApprovalStatus.PENDING_LECTURER_APPROVAL, 
                    ApprovalStatus.fromValue("pending_lecturer_approval"));
    }

    @Test
    @DisplayName("Invalid status value should throw exception")
    void invalidStatusValueShouldThrowException() {
        assertThrows(IllegalArgumentException.class, () -> {
            ApprovalStatus.fromValue("invalid_status");
        });
    }

    @Test
    @DisplayName("Null status value should throw exception")
    void nullStatusValueShouldThrowException() {
        assertThrows(IllegalArgumentException.class, () -> {
            ApprovalStatus.fromValue(null);
        });
    }
}