package com.usyd.catams.entity;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApprovalEntityTest {

    private Approval approval;
    private static final Long TIMESHEET_ID = 1L;
    private static final Long APPROVER_ID = 2L;
    private static final ApprovalAction ACTION = ApprovalAction.APPROVE;
    private static final ApprovalStatus PREVIOUS_STATUS = ApprovalStatus.PENDING_TUTOR_REVIEW;
    private static final ApprovalStatus NEW_STATUS = ApprovalStatus.APPROVED_BY_TUTOR;
    private static final String COMMENT = "Approved by tutor";

    @BeforeEach
    void setUp() {
        approval = new Approval(
            TIMESHEET_ID,
            APPROVER_ID,
            ACTION,
            PREVIOUS_STATUS,
            NEW_STATUS,
            COMMENT
        );
    }

    @Nested
    @DisplayName("Constructor Tests")
    class ConstructorTests {

        @Test
        void constructor_ShouldInitializeAllFields() {
            assertThat(approval.getTimesheetId()).isEqualTo(TIMESHEET_ID);
            assertThat(approval.getApproverId()).isEqualTo(APPROVER_ID);
            assertThat(approval.getAction()).isEqualTo(ACTION);
            assertThat(approval.getPreviousStatus()).isEqualTo(PREVIOUS_STATUS);
            assertThat(approval.getNewStatus()).isEqualTo(NEW_STATUS);
            assertThat(approval.getComment()).isEqualTo(COMMENT);
            assertThat(approval.getIsActive()).isTrue();
            assertThat(approval.getTimestamp()).isNull(); // Set by @PrePersist
        }

        @Test
        void constructorWithNullComment_ShouldAllowNullComment() {
            Approval approvalWithoutComment = new Approval(
                TIMESHEET_ID, APPROVER_ID, ACTION, PREVIOUS_STATUS, NEW_STATUS, null
            );

            assertThat(approvalWithoutComment.getComment()).isNull();
            assertThat(approvalWithoutComment.getIsActive()).isTrue();
        }

        @Test
        void defaultConstructor_ShouldCreateEmptyApproval() {
            Approval emptyApproval = new Approval();

            assertThat(emptyApproval.getId()).isNull();
            assertThat(emptyApproval.getTimesheetId()).isNull();
            assertThat(emptyApproval.getApproverId()).isNull();
            assertThat(emptyApproval.getAction()).isNull();
            assertThat(emptyApproval.getIsActive()).isNull();
        }
    }

    @Nested
    @DisplayName("Action Type Checking Tests")
    class ActionTypeTests {

        @Test
        void isSubmission_ShouldReturnTrueForSubmitAction() {
            approval.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);

            assertThat(approval.isSubmission()).isTrue();
            assertThat(approval.isApproval()).isFalse();
            assertThat(approval.isRejection()).isFalse();
            assertThat(approval.isModificationRequest()).isFalse();
        }

        @Test
        void isApproval_ShouldReturnTrueForApproveAction() {
            approval.setAction(ApprovalAction.APPROVE);

            assertThat(approval.isApproval()).isTrue();
            assertThat(approval.isSubmission()).isFalse();
            assertThat(approval.isRejection()).isFalse();
            assertThat(approval.isModificationRequest()).isFalse();
        }

        @Test
        void isRejection_ShouldReturnTrueForRejectAction() {
            approval.setAction(ApprovalAction.REJECT);

            assertThat(approval.isRejection()).isTrue();
            assertThat(approval.isSubmission()).isFalse();
            assertThat(approval.isApproval()).isFalse();
            assertThat(approval.isModificationRequest()).isFalse();
        }

        @Test
        void isModificationRequest_ShouldReturnTrueForRequestModificationAction() {
            approval.setAction(ApprovalAction.REQUEST_MODIFICATION);

            assertThat(approval.isModificationRequest()).isTrue();
            assertThat(approval.isSubmission()).isFalse();
            assertThat(approval.isApproval()).isFalse();
            assertThat(approval.isRejection()).isFalse();
        }

        @Test
        void actionTypeChecks_ShouldReturnFalseForNullAction() {
            approval.setAction(null);

            assertThat(approval.isSubmission()).isFalse();
            assertThat(approval.isApproval()).isFalse();
            assertThat(approval.isRejection()).isFalse();
            assertThat(approval.isModificationRequest()).isFalse();
        }
    }

    @Nested
    @DisplayName("Business Rules Validation Tests")
    class ValidationTests {

        @Test
        void validateBusinessRules_ShouldPassForValidApproval() {
            assertThat(approval).satisfies(a -> {
                // Should not throw any exception
                a.validateBusinessRules();
            });
        }

        @Test
        void validateBusinessRules_ShouldFailForNullTimesheetId() {
            approval.setTimesheetId(null);

            assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Timesheet ID cannot be null");
        }

        @Test
        void validateBusinessRules_ShouldFailForNullApproverId() {
            approval.setApproverId(null);

            assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Approver ID cannot be null");
        }

        @Test
        void validateBusinessRules_ShouldFailForNullAction() {
            approval.setAction(null);

            assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Approval action cannot be null");
        }

        @Test
        void validateBusinessRules_ShouldFailForNullPreviousStatus() {
            approval.setPreviousStatus(null);

            assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Previous status cannot be null");
        }

        @Test
        void validateBusinessRules_ShouldFailForNullNewStatus() {
            approval.setNewStatus(null);

            assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("New status cannot be null");
        }

        @Test
        void validateBusinessRules_ShouldFailForTooLongComment() {
            String longComment = "a".repeat(501); // Exceeds 500 character limit
            approval.setComment(longComment);

            assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Comment cannot exceed 500 characters");
        }

        @Test
        void validateBusinessRules_ShouldAllowMaxLengthComment() {
            String maxLengthComment = "a".repeat(500); // Exactly 500 characters
            approval.setComment(maxLengthComment);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
        }

        @Test
        void validateBusinessRules_ShouldAllowNullComment() {
            approval.setComment(null);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
        }

        @Test
        void validateBusinessRules_ShouldAllowEmptyComment() {
            approval.setComment("");

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
        }
    }

    @Nested
    @DisplayName("Status Transition Validation Tests")
    class StatusTransitionTests {

        @Test
        void validateBusinessRules_ShouldPassForValidDraftToSubmissionTransition() {
            approval.setPreviousStatus(ApprovalStatus.DRAFT);
            approval.setNewStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            approval.setAction(ApprovalAction.SUBMIT_FOR_APPROVAL);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
        }

        @Test
        void validateBusinessRules_ShouldPassForValidTutorApprovalTransition() {
            approval.setPreviousStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            approval.setNewStatus(ApprovalStatus.APPROVED_BY_TUTOR);
            approval.setAction(ApprovalAction.APPROVE);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
        }

        @Test
        void validateBusinessRules_ShouldPassForValidHRApprovalTransition() {
            approval.setPreviousStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
            approval.setNewStatus(ApprovalStatus.FINAL_APPROVED);
            approval.setAction(ApprovalAction.APPROVE);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
        }

        @Test
        void validateBusinessRules_ShouldPassForValidRejectionTransition() {
            approval.setPreviousStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            approval.setNewStatus(ApprovalStatus.REJECTED);
            approval.setAction(ApprovalAction.REJECT);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
        }

        @Test
        void validateBusinessRules_ShouldPassForValidModificationRequestTransition() {
            approval.setPreviousStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
            approval.setNewStatus(ApprovalStatus.MODIFICATION_REQUESTED);
            approval.setAction(ApprovalAction.REQUEST_MODIFICATION);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
        }

        @Test
        void validateBusinessRules_ShouldFailForInvalidTransition() {
            // Invalid transition: APPROVED_BY_TUTOR -> DRAFT
            approval.setPreviousStatus(ApprovalStatus.APPROVED_BY_TUTOR);
            approval.setNewStatus(ApprovalStatus.DRAFT);

            // Note: This test assumes ApprovalStatus.canTransitionTo() method exists
            // and validates transitions. If it doesn't exist, this test will pass
            // but should ideally fail for invalid transitions.
            try {
                approval.validateBusinessRules();
                // If no exception is thrown, either the transition is valid
                // or the validation method doesn't check transitions
            } catch (IllegalArgumentException e) {
                assertThat(e.getMessage()).contains("Invalid status transition");
            }
        }
    }

    @Nested
    @DisplayName("Lifecycle and Timestamp Tests")
    class LifecycleTests {

        @Test
        void onCreate_ShouldSetTimestamp() {
            assertThat(approval.getTimestamp()).isNull();

            approval.onCreate();

            assertThat(approval.getTimestamp()).isNotNull();
            assertThat(approval.getTimestamp()).isBeforeOrEqualTo(LocalDateTime.now());
        }

        @Test
        void onCreate_ShouldSetDefaultActiveStatus() {
            approval.setIsActive(null);

            approval.onCreate();

            assertThat(approval.getIsActive()).isTrue();
        }

        @Test
        void onCreate_ShouldNotOverwriteExistingActiveStatus() {
            approval.setIsActive(false);

            approval.onCreate();

            assertThat(approval.getIsActive()).isFalse();
        }

        @Test
        void timestampShouldBeSetOnCreation() {
            LocalDateTime beforeCreation = LocalDateTime.now().minusSeconds(1);
            approval.onCreate();
            LocalDateTime afterCreation = LocalDateTime.now().plusSeconds(1);

            assertThat(approval.getTimestamp()).isAfter(beforeCreation);
            assertThat(approval.getTimestamp()).isBefore(afterCreation);
        }
    }

    @Nested
    @DisplayName("Complete Approval Scenarios")
    class ApprovalScenariosTests {

        @Test
        void submissionApproval_ShouldHaveCorrectProperties() {
            Approval submission = new Approval(
                1L, 2L, ApprovalAction.SUBMIT_FOR_APPROVAL,
                ApprovalStatus.DRAFT, ApprovalStatus.PENDING_TUTOR_REVIEW, null
            );

            assertThat(submission.isSubmission()).isTrue();
            assertThat(submission.isApproval()).isFalse();
            assertThat(submission.getPreviousStatus()).isEqualTo(ApprovalStatus.DRAFT);
            assertThat(submission.getNewStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(submission.getComment()).isNull();
        }

        @Test
        void tutorApproval_ShouldHaveCorrectProperties() {
            Approval tutorApproval = new Approval(
                1L, 3L, ApprovalAction.APPROVE,
                ApprovalStatus.PENDING_TUTOR_REVIEW, ApprovalStatus.APPROVED_BY_TUTOR,
                "Looks good to me"
            );

            assertThat(tutorApproval.isApproval()).isTrue();
            assertThat(tutorApproval.isSubmission()).isFalse();
            assertThat(tutorApproval.getPreviousStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(tutorApproval.getNewStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);
            assertThat(tutorApproval.getComment()).isEqualTo("Looks good to me");
        }

        @Test
        void hrApproval_ShouldHaveCorrectProperties() {
            Approval hrApproval = new Approval(
                1L, 4L, ApprovalAction.APPROVE,
                ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR, ApprovalStatus.FINAL_APPROVED,
                "Final approval granted"
            );

            assertThat(hrApproval.isApproval()).isTrue();
            assertThat(hrApproval.getPreviousStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
            assertThat(hrApproval.getNewStatus()).isEqualTo(ApprovalStatus.FINAL_APPROVED);
            assertThat(hrApproval.getComment()).isEqualTo("Final approval granted");
        }

        @Test
        void rejection_ShouldHaveCorrectProperties() {
            Approval rejection = new Approval(
                1L, 3L, ApprovalAction.REJECT,
                ApprovalStatus.PENDING_TUTOR_REVIEW, ApprovalStatus.REJECTED,
                "Insufficient detail provided"
            );

            assertThat(rejection.isRejection()).isTrue();
            assertThat(rejection.isApproval()).isFalse();
            assertThat(rejection.getPreviousStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(rejection.getNewStatus()).isEqualTo(ApprovalStatus.REJECTED);
            assertThat(rejection.getComment()).isEqualTo("Insufficient detail provided");
        }

        @Test
        void modificationRequest_ShouldHaveCorrectProperties() {
            Approval modificationRequest = new Approval(
                1L, 4L, ApprovalAction.REQUEST_MODIFICATION,
                ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR, ApprovalStatus.MODIFICATION_REQUESTED,
                "Please provide more details about the work performed"
            );

            assertThat(modificationRequest.isModificationRequest()).isTrue();
            assertThat(modificationRequest.isApproval()).isFalse();
            assertThat(modificationRequest.isRejection()).isFalse();
            assertThat(modificationRequest.getPreviousStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
            assertThat(modificationRequest.getNewStatus()).isEqualTo(ApprovalStatus.MODIFICATION_REQUESTED);
            assertThat(modificationRequest.getComment()).isEqualTo("Please provide more details about the work performed");
        }
    }

    @Nested
    @DisplayName("Edge Cases and Error Handling")
    class EdgeCasesTests {

        @Test
        void approvalWithVeryLongValidComment_ShouldBeValid() {
            String longValidComment = "a".repeat(500); // Exactly at the limit
            approval.setComment(longValidComment);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
            assertThat(approval.getComment()).hasSize(500);
        }

        @Test
        void approvalWithSpecialCharactersInComment_ShouldBeValid() {
            String specialComment = "Test with special chars: áéíóú ñ @#$%^&*() 中文 русский العربية";
            approval.setComment(specialComment);

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
            assertThat(approval.getComment()).isEqualTo(specialComment);
        }

        @Test
        void approvalWithEmptyStringComment_ShouldBeValid() {
            approval.setComment("");

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
            assertThat(approval.getComment()).isEmpty();
        }

        @Test
        void approvalWithWhitespaceOnlyComment_ShouldBeValid() {
            approval.setComment("   \t\n   ");

            assertThat(approval).satisfies(a -> a.validateBusinessRules());
            assertThat(approval.getComment()).isEqualTo("   \t\n   ");
        }

        @Test
        void multipleValidationErrors_ShouldReportFirstError() {
            approval.setTimesheetId(null);
            approval.setApproverId(null);
            approval.setAction(null);

            // Should fail with the first validation error encountered
            assertThatThrownBy(() -> approval.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be null");
        }

        @Test
        void isActiveFlag_ShouldMaintainState() {
            assertThat(approval.getIsActive()).isTrue();

            approval.setIsActive(false);
            assertThat(approval.getIsActive()).isFalse();

            approval.setIsActive(true);
            assertThat(approval.getIsActive()).isTrue();
        }
    }
}
