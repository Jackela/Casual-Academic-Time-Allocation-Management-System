package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.usyd.catams.test.config.TestConfigurationLoader;
import com.usyd.catams.common.validation.TimesheetValidationConstants;

class TimesheetTest {

    private Timesheet timesheet;
    private Long tutorId = 1L;
    private Long courseId = 2L;
    private Long creatorId = 3L;
    private LocalDate weekStartDate;
    private BigDecimal hours;
    private BigDecimal hourlyRate;
    private String description;

    @BeforeEach
    void setUp() {
        // Initialize validation constants for testing
        TimesheetValidationConstants.setMaxHoursForTesting(TestConfigurationLoader.getMaxHours());
        
        weekStartDate = LocalDate.of(2024, 3, 4); // Monday
        hours = new BigDecimal("5.0");
        hourlyRate = new BigDecimal("25.00");
        description = "Test timesheet work";
        
        timesheet = new Timesheet(tutorId, courseId, weekStartDate, hours, hourlyRate, description, creatorId);
    }

    @Test
    void testDefaultConstructor() {
        // When
        Timesheet emptyTimesheet = new Timesheet();

        // Then
        assertThat(emptyTimesheet.getId()).isNull();
        assertThat(emptyTimesheet.getStatus()).isNull(); // Will be set by @PrePersist
        assertThat(emptyTimesheet.getApprovals()).isEmpty();
    }

    @Test
    void testConstructorWithWeekPeriod() {
        // Given
        WeekPeriod weekPeriod = new WeekPeriod(weekStartDate);
        Money hourlyRateMoney = new Money(hourlyRate);

        // When
        Timesheet timesheet = new Timesheet(tutorId, courseId, weekPeriod, hours, hourlyRateMoney, description, creatorId);

        // Then
        assertThat(timesheet.getTutorId()).isEqualTo(tutorId);
        assertThat(timesheet.getCourseId()).isEqualTo(courseId);
        assertThat(timesheet.getWeekPeriod()).isEqualTo(weekPeriod);
        assertThat(timesheet.getHours()).isEqualByComparingTo(hours);
        assertThat(timesheet.getHourlyRateMoney()).isEqualTo(hourlyRateMoney);
        assertThat(timesheet.getDescription()).isEqualTo(description);
        assertThat(timesheet.getCreatedBy()).isEqualTo(creatorId);
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
    }

    @Test
    void testConstructorWithPrimitives() {
        // When
        Timesheet timesheet = new Timesheet(tutorId, courseId, weekStartDate, hours, hourlyRate, description, creatorId);

        // Then
        assertThat(timesheet.getTutorId()).isEqualTo(tutorId);
        assertThat(timesheet.getCourseId()).isEqualTo(courseId);
        assertThat(timesheet.getWeekStartDate()).isEqualTo(weekStartDate);
        assertThat(timesheet.getHours()).isEqualByComparingTo(hours);
        assertThat(timesheet.getHourlyRate()).isEqualByComparingTo(hourlyRate);
        assertThat(timesheet.getDescription()).isEqualTo(description);
        assertThat(timesheet.getCreatedBy()).isEqualTo(creatorId);
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
    }

    @Test
    void testGettersAndSetters() {
        // Given
        Long newId = 123L;
        LocalDateTime now = LocalDateTime.now();
        
        // When
        timesheet.setId(newId);
        timesheet.setTutorId(999L);
        timesheet.setCourseId(888L);
        timesheet.setHours(new BigDecimal("3.5"));
        timesheet.setHourlyRate(new BigDecimal("30.00"));
        timesheet.setDescription("Updated description");
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        timesheet.setCreatedAt(now);
        timesheet.setUpdatedAt(now);
        timesheet.setCreatedBy(777L);

        // Then
        assertThat(timesheet.getId()).isEqualTo(newId);
        assertThat(timesheet.getTutorId()).isEqualTo(999L);
        assertThat(timesheet.getCourseId()).isEqualTo(888L);
        assertThat(timesheet.getHours()).isEqualByComparingTo(new BigDecimal("3.5"));
        assertThat(timesheet.getHourlyRate()).isEqualByComparingTo(new BigDecimal("30.00"));
        assertThat(timesheet.getDescription()).isEqualTo("Updated description");
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(timesheet.getCreatedAt()).isEqualTo(now);
        assertThat(timesheet.getUpdatedAt()).isEqualTo(now);
        assertThat(timesheet.getCreatedBy()).isEqualTo(777L);
    }

    @Test
    void testWeekPeriodMethods() {
        // Given
        LocalDate newWeekStart = LocalDate.of(2024, 3, 11); // Monday
        WeekPeriod newWeekPeriod = new WeekPeriod(newWeekStart);

        // When
        timesheet.setWeekPeriod(newWeekPeriod);
        timesheet.setWeekStartDate(LocalDate.of(2024, 3, 18));

        // Then
        assertThat(timesheet.getWeekPeriod()).isNotEqualTo(newWeekPeriod); // Should be overwritten
        assertThat(timesheet.getWeekStartDate()).isEqualTo(LocalDate.of(2024, 3, 18));
    }

    @Test
    void testMoneyMethods() {
        // Given
        Money newRate = new Money(new BigDecimal("35.00"));

        // When
        timesheet.setHourlyRate(newRate);

        // Then
        assertThat(timesheet.getHourlyRateMoney()).isEqualTo(newRate);
        assertThat(timesheet.getHourlyRate()).isEqualByComparingTo(new BigDecimal("35.00"));

        // Test setting with BigDecimal
        timesheet.setHourlyRate(new BigDecimal("40.00"));
        assertThat(timesheet.getHourlyRate()).isEqualByComparingTo(new BigDecimal("40.00"));
    }

    @Test
    void testCalculateTotalPay() {
        // When
        Money totalPay = timesheet.calculateTotalPay();
        BigDecimal totalPayAmount = timesheet.calculateTotalPayAmount();

        // Then
        // 5.0 hours * $25.00/hour = $125.00
        assertThat(totalPay.getAmount()).isEqualByComparingTo(new BigDecimal("125.00"));
        assertThat(totalPayAmount).isEqualByComparingTo(new BigDecimal("125.00"));
    }

    @Test
    void testIsEditable() {
        // Test DRAFT status
        timesheet.setStatus(ApprovalStatus.DRAFT);
        assertThat(timesheet.isEditable()).isTrue();

        // Test MODIFICATION_REQUESTED status
        timesheet.setStatus(ApprovalStatus.MODIFICATION_REQUESTED);
        assertThat(timesheet.isEditable()).isTrue();

        // Test non-editable statuses
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(timesheet.isEditable()).isFalse();

        timesheet.setStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
        assertThat(timesheet.isEditable()).isFalse();

        timesheet.setStatus(ApprovalStatus.FINAL_APPROVED);
        assertThat(timesheet.isEditable()).isFalse();

        timesheet.setStatus(ApprovalStatus.REJECTED);
        assertThat(timesheet.isEditable()).isFalse();
    }

    @Test
    void testCanBeApproved() {
        // Test approvable statuses
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(timesheet.canBeApproved()).isTrue();

        timesheet.setStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
        assertThat(timesheet.canBeApproved()).isTrue();

        // Test non-approvable statuses
        timesheet.setStatus(ApprovalStatus.DRAFT);
        assertThat(timesheet.canBeApproved()).isFalse();

        timesheet.setStatus(ApprovalStatus.MODIFICATION_REQUESTED);
        assertThat(timesheet.canBeApproved()).isFalse();

        timesheet.setStatus(ApprovalStatus.FINAL_APPROVED);
        assertThat(timesheet.canBeApproved()).isFalse();

        timesheet.setStatus(ApprovalStatus.REJECTED);
        assertThat(timesheet.canBeApproved()).isFalse();
    }

    @Test
    void testValidateBusinessRules() {
        // Test valid timesheet
        assertThat(timesheet).satisfies(t -> {
            // Should not throw exception
            t.validateBusinessRules();
        });

        // Test invalid hours - too low
        timesheet.setHours(new BigDecimal("0.05"));
        assertThatThrownBy(() -> timesheet.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(TestConfigurationLoader.getExpectedHoursValidationMessage());

        // Test invalid hours - too high
        timesheet.setHours(new BigDecimal("45.0"));
        assertThatThrownBy(() -> timesheet.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(TestConfigurationLoader.getExpectedHoursValidationMessage());

        // Reset to valid hours
        timesheet.setHours(new BigDecimal("5.0"));

        // Test invalid hourly rate - too low
        timesheet.setHourlyRate(new BigDecimal("5.00"));
        assertThatThrownBy(() -> timesheet.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Hourly rate must be between 10.00 and 200.00");

        // Test invalid hourly rate - too high
        timesheet.setHourlyRate(new BigDecimal("250.00"));
        assertThatThrownBy(() -> timesheet.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Hourly rate must be between 10.00 and 200.00");
    }

    @Test
    void testGetApprovals() {
        // Given
        assertThat(timesheet.getApprovals()).isEmpty();

        // When - Add approval through business method
        Approval approval = timesheet.submitForApproval(tutorId);

        // Then
        List<Approval> approvals = timesheet.getApprovals();
        assertThat(approvals).hasSize(1);
        assertThat(approvals.get(0)).isEqualTo(approval);
        
        // Verify immutable list
        assertThatThrownBy(() -> approvals.add(new Approval()))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void testSubmitForApproval() {
        // Given
        timesheet.setStatus(ApprovalStatus.DRAFT);

        // When
        Approval approval = timesheet.submitForApproval(tutorId);

        // Then
        assertThat(approval).isNotNull();
        assertThat(approval.getTimesheetId()).isEqualTo(timesheet.getId());
        assertThat(approval.getApproverId()).isEqualTo(tutorId);
        assertThat(approval.getAction()).isEqualTo(ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(approval.getPreviousStatus()).isEqualTo(ApprovalStatus.DRAFT);
        assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(timesheet.getApprovals()).hasSize(1);
    }

    @Test
    void testSubmitForApprovalFailsWhenNotEditable() {
        // Given
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);

        // When & Then
        assertThatThrownBy(() -> timesheet.submitForApproval(tutorId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot submit timesheet that is not in editable state");
    }

    @Test
    void testApprove() {
        // Given
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        Long approverId = 456L;
        String comment = "Looks good!";

        // When
        Approval approval = timesheet.approve(approverId, comment);

        // Then
        assertThat(approval).isNotNull();
        assertThat(approval.getApproverId()).isEqualTo(approverId);
        assertThat(approval.getAction()).isEqualTo(ApprovalAction.APPROVE);
        assertThat(approval.getPreviousStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);
        assertThat(approval.getComment()).isEqualTo(comment);
        
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);
    }

    @Test
    void testApproveFromHRReview() {
        // Given
        timesheet.setStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
        Long approverId = 456L;

        // When
        Approval approval = timesheet.approve(approverId, "Final approval");

        // Then
        assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.FINAL_APPROVED);
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.FINAL_APPROVED);
    }

    @Test
    void testApproveFailsWhenNotApprovable() {
        // Given
        timesheet.setStatus(ApprovalStatus.DRAFT);

        // When & Then
        assertThatThrownBy(() -> timesheet.approve(456L, "comment"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Timesheet cannot be approved in current state");
    }

    @Test
    void testReject() {
        // Given
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        Long approverId = 456L;
        String comment = "Needs more detail";

        // When
        Approval approval = timesheet.reject(approverId, comment);

        // Then
        assertThat(approval).isNotNull();
        assertThat(approval.getApproverId()).isEqualTo(approverId);
        assertThat(approval.getAction()).isEqualTo(ApprovalAction.REJECT);
        assertThat(approval.getPreviousStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(approval.getComment()).isEqualTo(comment);
        
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
    }

    @Test
    void testRejectFailsWithoutComment() {
        // Given
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);

        // When & Then
        assertThatThrownBy(() -> timesheet.reject(456L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required");

        assertThatThrownBy(() -> timesheet.reject(456L, ""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required");

        assertThatThrownBy(() -> timesheet.reject(456L, "   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required");
    }

    @Test
    void testRejectFailsWhenNotApprovable() {
        // Given
        timesheet.setStatus(ApprovalStatus.DRAFT);

        // When & Then
        assertThatThrownBy(() -> timesheet.reject(456L, "comment"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Timesheet cannot be rejected in current state");
    }

    @Test
    void testRequestModification() {
        // Given
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        Long approverId = 456L;
        String comment = "Please add more hours detail";

        // When
        Approval approval = timesheet.requestModification(approverId, comment);

        // Then
        assertThat(approval).isNotNull();
        assertThat(approval.getApproverId()).isEqualTo(approverId);
        assertThat(approval.getAction()).isEqualTo(ApprovalAction.REQUEST_MODIFICATION);
        assertThat(approval.getPreviousStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.MODIFICATION_REQUESTED);
        assertThat(approval.getComment()).isEqualTo(comment);
        
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.MODIFICATION_REQUESTED);
    }

    @Test
    void testRequestModificationFailsWithoutComment() {
        // Given
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);

        // When & Then
        assertThatThrownBy(() -> timesheet.requestModification(456L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Modification request comment is required");
    }

    @Test
    void testRequestModificationFailsWhenNotApprovable() {
        // Given
        timesheet.setStatus(ApprovalStatus.DRAFT);

        // When & Then
        assertThatThrownBy(() -> timesheet.requestModification(456L, "comment"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot request modification for timesheet in current state");
    }

    @Test
    void testGetMostRecentApproval() {
        // Given - No approvals initially
        assertThat(timesheet.getMostRecentApproval()).isEmpty();

        // When - Add multiple approvals
        timesheet.setStatus(ApprovalStatus.DRAFT);
        Approval approval1 = timesheet.submitForApproval(tutorId);
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        Approval approval2 = timesheet.approve(456L, "Approved");

        // Then
        Optional<Approval> mostRecent = timesheet.getMostRecentApproval();
        assertThat(mostRecent).isPresent();
        assertThat(mostRecent.get()).isEqualTo(approval2);
    }

    @Test
    void testGetApprovalHistory() {
        // Given
        timesheet.setStatus(ApprovalStatus.DRAFT);
        Approval approval1 = timesheet.submitForApproval(tutorId);
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        Approval approval2 = timesheet.approve(456L, "Approved");

        // When
        List<Approval> history = timesheet.getApprovalHistory();

        // Then
        assertThat(history).hasSize(2);
        assertThat(history.get(0)).isEqualTo(approval1);
        assertThat(history.get(1)).isEqualTo(approval2);
    }

    @Test
    void testHasApprovalAction() {
        // Given
        timesheet.setStatus(ApprovalStatus.DRAFT);
        timesheet.submitForApproval(tutorId);

        // When & Then
        assertThat(timesheet.hasApprovalAction(ApprovalAction.SUBMIT_FOR_APPROVAL)).isTrue();
        assertThat(timesheet.hasApprovalAction(ApprovalAction.APPROVE)).isFalse();
        assertThat(timesheet.hasApprovalAction(ApprovalAction.REJECT)).isFalse();
    }

    @Test
    void testGetApprovalsByAction() {
        // Given
        timesheet.setStatus(ApprovalStatus.DRAFT);
        Approval submit = timesheet.submitForApproval(tutorId);
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        Approval approve = timesheet.approve(456L, "Good work");

        // When
        List<Approval> submits = timesheet.getApprovalsByAction(ApprovalAction.SUBMIT_FOR_APPROVAL);
        List<Approval> approvals = timesheet.getApprovalsByAction(ApprovalAction.APPROVE);
        List<Approval> rejections = timesheet.getApprovalsByAction(ApprovalAction.REJECT);

        // Then
        assertThat(submits).hasSize(1);
        assertThat(submits.get(0)).isEqualTo(submit);
        
        assertThat(approvals).hasSize(1);
        assertThat(approvals.get(0)).isEqualTo(approve);
        
        assertThat(rejections).isEmpty();
    }

    @Test
    void testAddApprovalUpdatesTimestamp() {
        // Given
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        
        // When
        timesheet.setStatus(ApprovalStatus.DRAFT);
        timesheet.submitForApproval(tutorId);
        
        // Then
        LocalDateTime after = LocalDateTime.now().plusSeconds(1);
        assertThat(timesheet.getUpdatedAt()).isBetween(before, after);
    }

    @Test
    void testToString() {
        // Given
        timesheet.setId(123L);

        // When
        String toString = timesheet.toString();

        // Then
        assertThat(toString).contains("Timesheet{");
        assertThat(toString).contains("id=123");
        assertThat(toString).contains("tutorId=" + tutorId);
        assertThat(toString).contains("courseId=" + courseId);
        assertThat(toString).contains("hours=" + hours);
        assertThat(toString).contains("status=" + ApprovalStatus.DRAFT);
        assertThat(toString).contains("createdBy=" + creatorId);
    }

    @Test
    void testApprovalWorkflow() {
        // Test complete approval workflow
        
        // 1. Start as DRAFT
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        assertThat(timesheet.isEditable()).isTrue();
        assertThat(timesheet.canBeApproved()).isFalse();

        // 2. Submit for approval
        timesheet.submitForApproval(tutorId);
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        assertThat(timesheet.isEditable()).isFalse();
        assertThat(timesheet.canBeApproved()).isTrue();

        // 3. Approve by tutor (tutor approved, waiting lecturer final approval)
        timesheet.approve(456L, "Tutor approved");
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);
        assertThat(timesheet.canBeApproved()).isFalse();

        // 3b. Lecturer final approval (moves to HR queue)
        timesheet.finalApprove(789L, "Lecturer approved");
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
        assertThat(timesheet.canBeApproved()).isTrue();

        // 4. Final approval by HR
        timesheet.approve(789L, "HR approved");
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.FINAL_APPROVED);
        assertThat(timesheet.canBeApproved()).isFalse();
        assertThat(timesheet.isEditable()).isFalse();

        // Verify all approvals recorded (submit, tutor approve, lecturer final approve, HR approve)
        assertThat(timesheet.getApprovals()).hasSize(4);
    }

    @Test
    void testRejectionWorkflow() {
        // Test rejection workflow
        
        // 1. Submit for approval
        timesheet.setStatus(ApprovalStatus.DRAFT);
        timesheet.submitForApproval(tutorId);

        // 2. Reject
        timesheet.reject(456L, "Needs more detail");
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(timesheet.isEditable()).isFalse();
        assertThat(timesheet.canBeApproved()).isFalse();

        assertThat(timesheet.getApprovals()).hasSize(2);
    }

    @Test
    void testModificationRequestWorkflow() {
        // Test modification request workflow
        
        // 1. Submit for approval
        timesheet.setStatus(ApprovalStatus.DRAFT);
        timesheet.submitForApproval(tutorId);

        // 2. Request modification
        timesheet.requestModification(456L, "Please add more hours breakdown");
        assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.MODIFICATION_REQUESTED);
        assertThat(timesheet.isEditable()).isTrue();
        assertThat(timesheet.canBeApproved()).isFalse();

        assertThat(timesheet.getApprovals()).hasSize(2);
    }
}
