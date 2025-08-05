package com.usyd.catams.entity;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApprovalTest {

    private Approval approval;
    private Long timesheetId;
    private Long approverId;
    private ApprovalAction action;
    private ApprovalStatus previousStatus;
    private ApprovalStatus newStatus;
    private String comment;

    @BeforeEach
    void setUp() {
        timesheetId = 123L;
        approverId = 456L;
        action = ApprovalAction.SUBMIT_FOR_APPROVAL;
        previousStatus = ApprovalStatus.DRAFT;
        newStatus = ApprovalStatus.PENDING_LECTURER_APPROVAL;
        comment = "Submitting timesheet for approval";
        
        approval = new Approval(timesheetId, approverId, action, previousStatus, newStatus, comment);
    }

    @Test
    void testDefaultConstructor() {
        // When
        Approval emptyApproval = new Approval();

        // Then
        assertThat(emptyApproval.getId()).isNull();
        assertThat(emptyApproval.getTimesheetId()).isNull();
        assertThat(emptyApproval.getApproverId()).isNull();
        assertThat(emptyApproval.getAction()).isNull();
        assertThat(emptyApproval.getPreviousStatus()).isNull();
        assertThat(emptyApproval.getNewStatus()).isNull();
        assertThat(emptyApproval.getComment()).isNull();
        assertThat(emptyApproval.getTimestamp()).isNull();
        assertThat(emptyApproval.getIsActive()).isNull();
    }

    @Test
    void testParameterizedConstructor() {
        // When
        Approval approval = new Approval(timesheetId, approverId, action, previousStatus, newStatus, comment);

        // Then
        assertThat(approval.getTimesheetId()).isEqualTo(timesheetId);
        assertThat(approval.getApproverId()).isEqualTo(approverId);
        assertThat(approval.getAction()).isEqualTo(action);
        assertThat(approval.getPreviousStatus()).isEqualTo(previousStatus);
        assertThat(approval.getNewStatus()).isEqualTo(newStatus);
        assertThat(approval.getComment()).isEqualTo(comment);
        assertThat(approval.getIsActive()).isTrue();
        assertThat(approval.getTimestamp()).isNull(); // Set by @PrePersist
    }

    @Test
    void testGettersAndSetters() {
        // Given
        Long id = 789L;
        Long newTimesheetId = 999L;
        Long newApproverId = 888L;
        ApprovalAction newAction = ApprovalAction.APPROVE;
        ApprovalStatus newPreviousStatus = ApprovalStatus.PENDING_LECTURER_APPROVAL;
        ApprovalStatus newNewStatus = ApprovalStatus.PENDING_HR_REVIEW;
        String newComment = "Updated comment";
        LocalDateTime timestamp = LocalDateTime.now();
        Boolean isActive = false;

        // When
        approval.setId(id);
        approval.setTimesheetId(newTimesheetId);
        approval.setApproverId(newApproverId);
        approval.setAction(newAction);
        approval.setPreviousStatus(newPreviousStatus);
        approval.setNewStatus(newNewStatus);
        approval.setComment(newComment);
        approval.setTimestamp(timestamp);
        approval.setIsActive(isActive);

        // Then
        assertThat(approval.getId()).isEqualTo(id);
        assertThat(approval.getTimesheetId()).isEqualTo(newTimesheetId);
        assertThat(approval.getApproverId()).isEqualTo(newApproverId);
        assertThat(approval.getAction()).isEqualTo(newAction);
        assertThat(approval.getPreviousStatus()).isEqualTo(newPreviousStatus);
        assertThat(approval.getNewStatus()).isEqualTo(newNewStatus);
        assertThat(approval.getComment()).isEqualTo(newComment);
        assertThat(approval.getTimestamp()).isEqualTo(timestamp);
        assertThat(approval.getIsActive()).isEqualTo(isActive);
    }

    @Test
    void testIsSubmission() {
        // Test true case
        approval.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(approval.isSubmission()).isTrue();

        // Test false cases
        approval.setAction(ApprovalAction.APPROVE);
        assertThat(approval.isSubmission()).isFalse();

        approval.setAction(ApprovalAction.REJECT);
        assertThat(approval.isSubmission()).isFalse();

        approval.setAction(ApprovalAction.REQUEST_MODIFICATION);
        assertThat(approval.isSubmission()).isFalse();
    }

    @Test
    void testIsApproval() {
        // Test true case
        approval.setAction(ApprovalAction.APPROVE);
        assertThat(approval.isApproval()).isTrue();

        // Test false cases
        approval.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(approval.isApproval()).isFalse();

        approval.setAction(ApprovalAction.REJECT);
        assertThat(approval.isApproval()).isFalse();

        approval.setAction(ApprovalAction.REQUEST_MODIFICATION);
        assertThat(approval.isApproval()).isFalse();
    }

    @Test
    void testIsRejection() {
        // Test true case
        approval.setAction(ApprovalAction.REJECT);
        assertThat(approval.isRejection()).isTrue();

        // Test false cases
        approval.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(approval.isRejection()).isFalse();

        approval.setAction(ApprovalAction.APPROVE);
        assertThat(approval.isRejection()).isFalse();

        approval.setAction(ApprovalAction.REQUEST_MODIFICATION);
        assertThat(approval.isRejection()).isFalse();
    }

    @Test
    void testIsModificationRequest() {
        // Test true case
        approval.setAction(ApprovalAction.REQUEST_MODIFICATION);
        assertThat(approval.isModificationRequest()).isTrue();

        // Test false cases
        approval.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(approval.isModificationRequest()).isFalse();

        approval.setAction(ApprovalAction.APPROVE);
        assertThat(approval.isModificationRequest()).isFalse();

        approval.setAction(ApprovalAction.REJECT);
        assertThat(approval.isModificationRequest()).isFalse();
    }

    @Test
    void testValidateBusinessRulesSuccess() {
        // When & Then - Should not throw exception
        approval.validateBusinessRules();
    }

    @Test
    void testValidateBusinessRulesFailsWithNullTimesheetId() {
        // Given
        approval.setTimesheetId(null);

        // When & Then
        assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Timesheet ID cannot be null");
    }

    @Test
    void testValidateBusinessRulesFailsWithNullApproverId() {
        // Given
        approval.setApproverId(null);

        // When & Then
        assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Approver ID cannot be null");
    }

    @Test
    void testValidateBusinessRulesFailsWithNullAction() {
        // Given
        approval.setAction(null);

        // When & Then
        assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Approval action cannot be null");
    }

    @Test
    void testValidateBusinessRulesFailsWithNullPreviousStatus() {
        // Given
        approval.setPreviousStatus(null);

        // When & Then
        assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Previous status cannot be null");
    }

    @Test
    void testValidateBusinessRulesFailsWithNullNewStatus() {
        // Given
        approval.setNewStatus(null);

        // When & Then
        assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("New status cannot be null");
    }

    @Test
    void testValidateBusinessRulesFailsWithTooLongComment() {
        // Given - Comment with more than 500 characters
        String longComment = "x".repeat(501);
        approval.setComment(longComment);

        // When & Then
        assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Comment cannot exceed 500 characters");
    }

    @Test
    void testValidateBusinessRulesAcceptsMaxLengthComment() {
        // Given - Comment with exactly 500 characters
        String maxComment = "x".repeat(500);
        approval.setComment(maxComment);

        // When & Then - Should not throw exception
        approval.validateBusinessRules();
        assertThat(approval.getComment()).hasSize(500);
    }

    @Test
    void testValidateBusinessRulesAcceptsNullComment() {
        // Given
        approval.setComment(null);

        // When & Then - Should not throw exception
        approval.validateBusinessRules();
        assertThat(approval.getComment()).isNull();
    }

    @Test
    void testToString() {
        // Given
        approval.setId(123L);
        approval.setTimestamp(LocalDateTime.of(2024, 3, 15, 10, 30, 0));

        // When
        String toString = approval.toString();

        // Then
        assertThat(toString).contains("Approval{");
        assertThat(toString).contains("id=123");
        assertThat(toString).contains("timesheetId=" + timesheetId);
        assertThat(toString).contains("approverId=" + approverId);
        assertThat(toString).contains("action=" + action);
        assertThat(toString).contains("previousStatus=" + previousStatus);
        assertThat(toString).contains("newStatus=" + newStatus);
        assertThat(toString).contains("comment='" + comment + "'");
        assertThat(toString).contains("timestamp=2024-03-15T10:30");
        assertThat(toString).contains("isActive=true");
    }

    @Test
    void testDifferentApprovalActions() {
        // Test SUBMIT_FOR_APPROVAL
        Approval submission = new Approval(1L, 100L, ApprovalAction.SUBMIT_FOR_APPROVAL, 
                ApprovalStatus.DRAFT, ApprovalStatus.PENDING_LECTURER_APPROVAL, "Submitting");
        assertThat(submission.isSubmission()).isTrue();
        assertThat(submission.isApproval()).isFalse();
        assertThat(submission.isRejection()).isFalse();
        assertThat(submission.isModificationRequest()).isFalse();

        // Test APPROVE
        Approval approvalAction = new Approval(1L, 200L, ApprovalAction.APPROVE, 
                ApprovalStatus.PENDING_LECTURER_APPROVAL, ApprovalStatus.PENDING_HR_REVIEW, "Approved");
        assertThat(approvalAction.isSubmission()).isFalse();
        assertThat(approvalAction.isApproval()).isTrue();
        assertThat(approvalAction.isRejection()).isFalse();
        assertThat(approvalAction.isModificationRequest()).isFalse();

        // Test REJECT
        Approval rejection = new Approval(1L, 300L, ApprovalAction.REJECT, 
                ApprovalStatus.PENDING_LECTURER_APPROVAL, ApprovalStatus.REJECTED, "Rejected");
        assertThat(rejection.isSubmission()).isFalse();
        assertThat(rejection.isApproval()).isFalse();
        assertThat(rejection.isRejection()).isTrue();
        assertThat(rejection.isModificationRequest()).isFalse();

        // Test REQUEST_MODIFICATION
        Approval modRequest = new Approval(1L, 400L, ApprovalAction.REQUEST_MODIFICATION, 
                ApprovalStatus.PENDING_LECTURER_APPROVAL, ApprovalStatus.MODIFICATION_REQUESTED, "Needs changes");
        assertThat(modRequest.isSubmission()).isFalse();
        assertThat(modRequest.isApproval()).isFalse();
        assertThat(modRequest.isRejection()).isFalse();
        assertThat(modRequest.isModificationRequest()).isTrue();
    }

    @Test
    void testApprovalWorkflowScenarios() {
        // Scenario 1: Initial submission
        Approval submission = new Approval(1L, 100L, ApprovalAction.SUBMIT_FOR_APPROVAL, 
                ApprovalStatus.DRAFT, ApprovalStatus.PENDING_LECTURER_APPROVAL, null);
        submission.validateBusinessRules();
        assertThat(submission.isSubmission()).isTrue();

        // Scenario 2: Lecturer approval (moves to HR review)
        Approval lecturerApproval = new Approval(1L, 200L, ApprovalAction.APPROVE, 
                ApprovalStatus.PENDING_LECTURER_APPROVAL, ApprovalStatus.PENDING_HR_REVIEW, "Looks good");
        lecturerApproval.validateBusinessRules();
        assertThat(lecturerApproval.isApproval()).isTrue();

        // Scenario 3: HR final approval
        Approval hrApproval = new Approval(1L, 300L, ApprovalAction.APPROVE, 
                ApprovalStatus.PENDING_HR_REVIEW, ApprovalStatus.FINAL_APPROVED, "Final approval");
        hrApproval.validateBusinessRules();
        assertThat(hrApproval.isApproval()).isTrue();

        // Scenario 4: Rejection at any stage
        Approval rejection = new Approval(1L, 200L, ApprovalAction.REJECT, 
                ApprovalStatus.PENDING_LECTURER_APPROVAL, ApprovalStatus.REJECTED, "Insufficient detail");
        rejection.validateBusinessRules();
        assertThat(rejection.isRejection()).isTrue();

        // Scenario 5: Modification request
        Approval modRequest = new Approval(1L, 200L, ApprovalAction.REQUEST_MODIFICATION, 
                ApprovalStatus.PENDING_LECTURER_APPROVAL, ApprovalStatus.MODIFICATION_REQUESTED, "Add more hours breakdown");
        modRequest.validateBusinessRules();
        assertThat(modRequest.isModificationRequest()).isTrue();
    }

    @Test
    void testActiveStatusManagement() {
        // Test default active status
        assertThat(approval.getIsActive()).isTrue();

        // Test setting inactive
        approval.setIsActive(false);
        assertThat(approval.getIsActive()).isFalse();

        // Test setting back to active
        approval.setIsActive(true);
        assertThat(approval.getIsActive()).isTrue();

        // Test null handling
        approval.setIsActive(null);
        assertThat(approval.getIsActive()).isNull();
    }

    @Test
    void testCommentHandling() {
        // Test with no comment
        approval.setComment(null);
        approval.validateBusinessRules();
        assertThat(approval.getComment()).isNull();

        // Test with empty comment
        approval.setComment("");
        approval.validateBusinessRules();
        assertThat(approval.getComment()).isEmpty();

        // Test with whitespace comment
        approval.setComment("   ");
        approval.validateBusinessRules();
        assertThat(approval.getComment()).isEqualTo("   ");

        // Test with normal comment
        approval.setComment("This is a valid comment");
        approval.validateBusinessRules();
        assertThat(approval.getComment()).isEqualTo("This is a valid comment");
    }

    @Test
    void testTimestampHandling() {
        // Test that timestamp is initially null (set by @PrePersist)
        Approval newApproval = new Approval(1L, 100L, ApprovalAction.SUBMIT_FOR_APPROVAL, 
                ApprovalStatus.DRAFT, ApprovalStatus.PENDING_LECTURER_APPROVAL, null);
        assertThat(newApproval.getTimestamp()).isNull();

        // Test setting timestamp manually
        LocalDateTime now = LocalDateTime.now();
        newApproval.setTimestamp(now);
        assertThat(newApproval.getTimestamp()).isEqualTo(now);
    }

    @Test
    void testAuditTrailScenario() {
        // Simulate a complete audit trail for a timesheet
        Long timesheetId = 1L;
        Long tutorId = 100L;
        Long lecturerId = 200L;
        Long hrId = 300L;

        // 1. Initial submission by tutor
        Approval submission = new Approval(timesheetId, tutorId, ApprovalAction.SUBMIT_FOR_APPROVAL, 
                ApprovalStatus.DRAFT, ApprovalStatus.PENDING_LECTURER_APPROVAL, "Initial submission");
        submission.validateBusinessRules();
        assertThat(submission.isSubmission()).isTrue();

        // 2. Lecturer requests modification
        Approval modRequest = new Approval(timesheetId, lecturerId, ApprovalAction.REQUEST_MODIFICATION, 
                ApprovalStatus.PENDING_LECTURER_APPROVAL, ApprovalStatus.MODIFICATION_REQUESTED, 
                "Please provide more detail on the 5-hour session");
        modRequest.validateBusinessRules();
        assertThat(modRequest.isModificationRequest()).isTrue();

        // 3. Tutor resubmits after changes
        Approval resubmission = new Approval(timesheetId, tutorId, ApprovalAction.SUBMIT_FOR_APPROVAL, 
                ApprovalStatus.DRAFT, ApprovalStatus.PENDING_LECTURER_APPROVAL, "Resubmitting with requested changes");
        resubmission.validateBusinessRules();
        assertThat(resubmission.isSubmission()).isTrue();

        // 4. Lecturer approves
        Approval lecturerApproval = new Approval(timesheetId, lecturerId, ApprovalAction.APPROVE, 
                ApprovalStatus.PENDING_LECTURER_APPROVAL, ApprovalStatus.PENDING_HR_REVIEW, "Approved");
        lecturerApproval.validateBusinessRules();
        assertThat(lecturerApproval.isApproval()).isTrue();

        // 5. HR gives final approval
        Approval finalApproval = new Approval(timesheetId, hrId, ApprovalAction.APPROVE, 
                ApprovalStatus.PENDING_HR_REVIEW, ApprovalStatus.FINAL_APPROVED, "Final approval granted");
        finalApproval.validateBusinessRules();
        assertThat(finalApproval.isApproval()).isTrue();

        // Verify all approvals are for the same timesheet
        assertThat(submission.getTimesheetId()).isEqualTo(timesheetId);
        assertThat(modRequest.getTimesheetId()).isEqualTo(timesheetId);
        assertThat(resubmission.getTimesheetId()).isEqualTo(timesheetId);
        assertThat(lecturerApproval.getTimesheetId()).isEqualTo(timesheetId);
        assertThat(finalApproval.getTimesheetId()).isEqualTo(timesheetId);
    }

    @Test
    void testEdgeCaseValidation() {
        // Test with minimum valid values
        Approval minimalApproval = new Approval(1L, 1L, ApprovalAction.SUBMIT_FOR_APPROVAL, 
                ApprovalStatus.DRAFT, ApprovalStatus.PENDING_LECTURER_APPROVAL, null);
        minimalApproval.validateBusinessRules();
        assertThat(minimalApproval.getComment()).isNull();

        // Test with maximum comment length (500 characters)
        String maxComment = "a".repeat(500);
        minimalApproval.setComment(maxComment);
        minimalApproval.validateBusinessRules();
        assertThat(minimalApproval.getComment()).hasSize(500);
    }
}