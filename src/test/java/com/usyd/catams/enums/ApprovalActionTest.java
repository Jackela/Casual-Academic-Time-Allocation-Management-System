package com.usyd.catams.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ApprovalAction enum.
 * 
 * Tests enum semantics and role-based permissions.
 */
class ApprovalActionTest {

    @Test
    @DisplayName("fromValue should parse known values")
    void fromValue_ShouldParseKnownValues() {
        assertEquals(ApprovalAction.SUBMIT_FOR_APPROVAL, ApprovalAction.fromValue("SUBMIT_FOR_APPROVAL"));
        assertEquals(ApprovalAction.TUTOR_CONFIRM, ApprovalAction.fromValue("TUTOR_CONFIRM"));
        assertEquals(ApprovalAction.REQUEST_MODIFICATION, ApprovalAction.fromValue("REQUEST_MODIFICATION"));
    }

    @Test
    @DisplayName("fromValue should reject unknown values")
    void fromValue_ShouldRejectUnknownValues() {
        assertThrows(IllegalArgumentException.class, () -> ApprovalAction.fromValue("UNKNOWN"));
        assertThrows(IllegalArgumentException.class, () -> ApprovalAction.fromValue(null));
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
