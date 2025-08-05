package com.usyd.catams.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ApprovalStatus enum.
 * 
 * Tests the status transitions and business rules as specified in SSOT document:
 * docs/timesheet-approval-workflow-ssot.md
 */
class ApprovalStatusTest {

    @Test
    @DisplayName("APPROVED_BY_TUTOR status should not be editable")
    void tutorApprovedShouldNotBeEditable() {
        ApprovalStatus status = ApprovalStatus.APPROVED_BY_TUTOR;
        
        assertFalse(status.isEditable());
    }

    @Test
    @DisplayName("APPROVED_BY_TUTOR status should not be final")
    void tutorApprovedShouldNotBeFinal() {
        ApprovalStatus status = ApprovalStatus.APPROVED_BY_TUTOR;
        
        assertFalse(status.isFinal());
    }

    @Test
    @DisplayName("REJECTED status should NOT be editable (read-only)")
    void rejectedShouldNotBeEditable() {
        ApprovalStatus status = ApprovalStatus.REJECTED;
        
        assertFalse(status.isEditable());
    }

    @Test
    @DisplayName("DRAFT status should be editable")
    void draftShouldBeEditable() {
        ApprovalStatus status = ApprovalStatus.DRAFT;
        
        assertTrue(status.isEditable());
    }

    @Test
    @DisplayName("PENDING_TUTOR_REVIEW should be pending")
    void pendingTutorReviewShouldBePending() {
        ApprovalStatus status = ApprovalStatus.PENDING_TUTOR_REVIEW;
        
        assertTrue(status.isPending());
        assertFalse(status.isEditable());
        assertFalse(status.isFinal());
    }

    @Test
    @DisplayName("APPROVED_BY_LECTURER_AND_TUTOR should be pending")
    void pendingHrReviewShouldBePending() {
        ApprovalStatus status = ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR;
        
        assertTrue(status.isPending());
        assertFalse(status.isEditable());
        assertFalse(status.isFinal());
    }

    @Test
    @DisplayName("FINAL_APPROVED should be final")
    void hrApprovedShouldBeFinal() {
        ApprovalStatus status = ApprovalStatus.FINAL_APPROVED;
        
        assertTrue(status.isFinal());
        assertFalse(status.isEditable());
        assertFalse(status.isPending());
    }

    @Test
    @DisplayName("REJECTED should be final")
    void rejectedShouldBeFinal() {
        ApprovalStatus status = ApprovalStatus.REJECTED;
        
        assertTrue(status.isFinal());
        assertFalse(status.isEditable()); // REJECTED is read-only and cannot be modified
        assertFalse(status.isPending());
    }

    @Test
    @DisplayName("Display names should be correct")
    void displayNamesShouldBeCorrect() {
        assertEquals("Draft", ApprovalStatus.DRAFT.getDisplayName());
        assertEquals("Pending Tutor Review", ApprovalStatus.PENDING_TUTOR_REVIEW.getDisplayName());
        assertEquals("Approved by Tutor", ApprovalStatus.APPROVED_BY_TUTOR.getDisplayName());
        assertEquals("Approved by Lecturer and Tutor", ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR.getDisplayName());
        assertEquals("Final Approved", ApprovalStatus.FINAL_APPROVED.getDisplayName());
        assertEquals("Rejected", ApprovalStatus.REJECTED.getDisplayName());
    }

    @Test
    @DisplayName("Values should be correct")
    void valuesShouldBeCorrect() {
        assertEquals("draft", ApprovalStatus.DRAFT.getValue());
        assertEquals("pending_tutor_review", ApprovalStatus.PENDING_TUTOR_REVIEW.getValue());
        assertEquals("approved_by_tutor", ApprovalStatus.APPROVED_BY_TUTOR.getValue());
        assertEquals("approved_by_lecturer_and_tutor", ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR.getValue());
        assertEquals("final_approved", ApprovalStatus.FINAL_APPROVED.getValue());
        assertEquals("rejected", ApprovalStatus.REJECTED.getValue());
    }
}
