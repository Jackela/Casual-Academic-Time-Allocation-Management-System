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
    @DisplayName("TUTOR_CONFIRMED status should not be editable")
    void tutorApprovedShouldNotBeEditable() {
        ApprovalStatus status = ApprovalStatus.TUTOR_CONFIRMED;
        
        assertFalse(status.isEditable());
    }

    @Test
    @DisplayName("TUTOR_CONFIRMED status should not be final")
    void tutorApprovedShouldNotBeFinal() {
        ApprovalStatus status = ApprovalStatus.TUTOR_CONFIRMED;
        
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
    @DisplayName("PENDING_TUTOR_CONFIRMATION should be pending")
    void pendingTutorReviewShouldBePending() {
        ApprovalStatus status = ApprovalStatus.PENDING_TUTOR_CONFIRMATION;
        
        assertTrue(status.isPending());
        assertFalse(status.isEditable());
        assertFalse(status.isFinal());
    }

    @Test
    @DisplayName("LECTURER_CONFIRMED should be pending")
    void pendingHrReviewShouldBePending() {
        ApprovalStatus status = ApprovalStatus.LECTURER_CONFIRMED;
        
        assertTrue(status.isPending());
        assertFalse(status.isEditable());
        assertFalse(status.isFinal());
    }

    @Test
    @DisplayName("FINAL_CONFIRMED should be final")
    void hrApprovedShouldBeFinal() {
        ApprovalStatus status = ApprovalStatus.FINAL_CONFIRMED;
        
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
        assertEquals("Pending Tutor Confirmation", ApprovalStatus.PENDING_TUTOR_CONFIRMATION.getDisplayName());
        assertEquals("Tutor Confirmed", ApprovalStatus.TUTOR_CONFIRMED.getDisplayName());
        assertEquals("Lecturer Confirmed", ApprovalStatus.LECTURER_CONFIRMED.getDisplayName());
        assertEquals("Final Confirmed", ApprovalStatus.FINAL_CONFIRMED.getDisplayName());
        assertEquals("Rejected", ApprovalStatus.REJECTED.getDisplayName());
    }

    @Test
    @DisplayName("Values should be correct")
    void valuesShouldBeCorrect() {
        assertEquals("draft", ApprovalStatus.DRAFT.getValue());
        assertEquals("pending_tutor_confirmation", ApprovalStatus.PENDING_TUTOR_CONFIRMATION.getValue());
        assertEquals("tutor_confirmed", ApprovalStatus.TUTOR_CONFIRMED.getValue());
        assertEquals("lecturer_confirmed", ApprovalStatus.LECTURER_CONFIRMED.getValue());
        assertEquals("final_confirmed", ApprovalStatus.FINAL_CONFIRMED.getValue());
        assertEquals("rejected", ApprovalStatus.REJECTED.getValue());
    }
}
