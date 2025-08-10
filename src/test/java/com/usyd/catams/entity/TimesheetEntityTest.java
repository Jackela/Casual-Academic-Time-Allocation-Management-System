package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.usyd.catams.test.config.TestConfigurationLoader;
// import com.usyd.catams.common.validation.TimesheetValidationConstants;

public class TimesheetEntityTest {

    private Long TUTOR_ID;
    private Long COURSE_ID;
    private LocalDate WEEK_START;
    private BigDecimal HOURS;
    private Money HOURLY_RATE;
    private String DESCRIPTION;
    private Long CREATOR_ID;
    private Timesheet timesheet;

    @BeforeEach
    void setUp() {
        TUTOR_ID = 1L;
        COURSE_ID = 10L;
        WEEK_START = LocalDate.of(2024, 3, 4);
        HOURS = new BigDecimal("10.5");
        HOURLY_RATE = new Money(new BigDecimal("25.00"));
        DESCRIPTION = "Tutorial preparation and delivery";
        CREATOR_ID = 100L;

        timesheet = new Timesheet(
                TUTOR_ID,
                COURSE_ID,
                new WeekPeriod(WEEK_START),
                HOURS,
                HOURLY_RATE,
                DESCRIPTION,
                CREATOR_ID
        );
    }

    @Nested
    @DisplayName("Constructor Tests")
    class ConstructorTests {

        @Test
        void constructor_ShouldInitializeAllFields() {
            assertThat(timesheet.getTutorId()).isEqualTo(TUTOR_ID);
            assertThat(timesheet.getCourseId()).isEqualTo(COURSE_ID);
            assertThat(timesheet.getWeekStartDate()).isEqualTo(WEEK_START);
            assertThat(timesheet.getHours()).isEqualByComparingTo(HOURS);
            assertThat(timesheet.getHourlyRateMoney()).isEqualTo(HOURLY_RATE);
            assertThat(timesheet.getDescription()).isEqualTo(DESCRIPTION);
            assertThat(timesheet.getCreatedBy()).isEqualTo(CREATOR_ID);
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        }

        @Test
        void constructorWithPrimitives_ShouldConvertToValueObjects() {
            Timesheet primitiveTimesheet = new Timesheet(
                TUTOR_ID, COURSE_ID, WEEK_START, HOURS, new BigDecimal("25.00"), DESCRIPTION, CREATOR_ID
            );

            assertThat(primitiveTimesheet.getWeekPeriod()).isNotNull();
            assertThat(primitiveTimesheet.getWeekStartDate()).isEqualTo(WEEK_START);
            assertThat(primitiveTimesheet.getHourlyRateMoney()).isEqualTo(HOURLY_RATE);
        }

        @Test
        void defaultConstructor_ShouldCreateEmptyTimesheet() {
            Timesheet emptyTimesheet = new Timesheet();

            assertThat(emptyTimesheet.getId()).isNull();
            assertThat(emptyTimesheet.getStatus()).isNull();
            assertThat(emptyTimesheet.getApprovals()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Business Logic Tests")
    class BusinessLogicTests {

        @Test
        void calculateTotalPay_ShouldReturnCorrectAmount() {
            Money result = timesheet.calculateTotalPay();

            // 10.5 hours * $25.00 = $262.50
            assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("262.50"));
        }

        @Test
        void calculateTotalPayAmount_ShouldReturnBigDecimalAmount() {
            BigDecimal result = timesheet.calculateTotalPayAmount();

            assertThat(result).isEqualByComparingTo(new BigDecimal("262.50"));
        }

        @Test
        void isEditable_ShouldReturnTrueForDraftStatus() {
            timesheet.setStatus(ApprovalStatus.DRAFT);

            assertThat(timesheet.isEditable()).isTrue();
        }

        @Test
        void isEditable_ShouldReturnTrueForModificationRequestedStatus() {
            timesheet.setStatus(ApprovalStatus.MODIFICATION_REQUESTED);

            assertThat(timesheet.isEditable()).isTrue();
        }

        @Test
        void isEditable_ShouldReturnFalseForOtherStatuses() {
            ApprovalStatus[] nonEditableStatuses = {
                ApprovalStatus.PENDING_TUTOR_REVIEW,
                ApprovalStatus.PENDING_TUTOR_REVIEW,
            ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR,
            ApprovalStatus.FINAL_APPROVED,
            ApprovalStatus.REJECTED,
            ApprovalStatus.FINAL_APPROVED
            };

            for (ApprovalStatus status : nonEditableStatuses) {
                timesheet.setStatus(status);
                assertThat(timesheet.isEditable())
                    .as("Status %s should not be editable", status)
                    .isFalse();
            }
        }

        @Test
        void canBeApproved_ShouldReturnTrueForPendingStatuses() {
            timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(timesheet.canBeApproved()).isTrue();

            timesheet.setStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
            assertThat(timesheet.canBeApproved()).isTrue();
        }

        @Test
        void canBeApproved_ShouldReturnFalseForOtherStatuses() {
            ApprovalStatus[] nonApprovableStatuses = {
                ApprovalStatus.DRAFT,
                ApprovalStatus.MODIFICATION_REQUESTED,
                ApprovalStatus.APPROVED_BY_TUTOR,
                ApprovalStatus.FINAL_APPROVED,
                ApprovalStatus.REJECTED
            };

            for (ApprovalStatus status : nonApprovableStatuses) {
                timesheet.setStatus(status);
                assertThat(timesheet.canBeApproved())
                    .as("Status %s should not be approvable", status)
                    .isFalse();
            }
        }
    }

    @Nested
    @DisplayName("Validation Tests")
    class ValidationTests {

        @Test
        void validateBusinessRules_ShouldPassForValidTimesheet() {
            assertThat(timesheet).satisfies(t -> {
                // Should not throw any exception
                t.validateBusinessRules();
            });
        }

        @Test
        void validateBusinessRules_ShouldFailForTooFewHours() {
            timesheet.setHours(new BigDecimal("0.05")); // Below minimum

            assertThatThrownBy(() -> timesheet.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(TestConfigurationLoader.getExpectedHoursValidationMessage());        }

        @Test
        void validateBusinessRules_ShouldFailForTooManyHours() {
            // Use configuration max + 1 to ensure we're above maximum
            BigDecimal aboveMax = TestConfigurationLoader.getMaxHours().add(BigDecimal.ONE);
            timesheet.setHours(aboveMax);

            assertThatThrownBy(() -> timesheet.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(TestConfigurationLoader.getExpectedHoursValidationMessage());        }

        @Test
        void validateBusinessRules_ShouldPassForBoundaryHours() {
            // Test minimum boundary
            timesheet.setHours(TestConfigurationLoader.getMinHours());
            assertThat(timesheet).satisfies(t -> t.validateBusinessRules());

            // Test maximum boundary
            timesheet.setHours(TestConfigurationLoader.getMaxHours());            assertThat(timesheet).satisfies(t -> t.validateBusinessRules());
        }

        @Test
        void validateBusinessRules_ShouldFailForTooLowHourlyRate() {
            timesheet.setHourlyRate(new Money(new BigDecimal("5.00"))); // Below minimum 10.00

            assertThatThrownBy(() -> timesheet.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Hourly rate must be between 10.00 and 200.00");
        }

        @Test
        void validateBusinessRules_ShouldFailForTooHighHourlyRate() {
            timesheet.setHourlyRate(new Money(new BigDecimal("250.00"))); // Above maximum 200.00

            assertThatThrownBy(() -> timesheet.validateBusinessRules())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Hourly rate must be between 10.00 and 200.00");
        }

        @Test
        void validateBusinessRules_ShouldPassForBoundaryHourlyRates() {
            timesheet.setHourlyRate(new Money(new BigDecimal("10.00")));
            assertThat(timesheet).satisfies(t -> t.validateBusinessRules());

            timesheet.setHourlyRate(new Money(new BigDecimal("200.00")));
            assertThat(timesheet).satisfies(t -> t.validateBusinessRules());
        }
    }

    @Nested
    @DisplayName("Timesheet Approval Workflow Management")
    class ApprovalManagementTests {

        @Test
        @DisplayName("Lecturer Timesheet Submission - When lecturer submits draft timesheet for casual staff payment, should start approval workflow")
        void lecturerSubmitsCasualStaffTimesheet_ShouldInitiateApprovalWorkflow() {
            // Given: Lecturer has created a draft timesheet documenting casual staff (tutor/marker) work hours
            timesheet.setStatus(ApprovalStatus.DRAFT);
            Long lecturerId = 1L; // Course lecturer who oversees casual staff

            // When: Lecturer submits the timesheet to initiate payment approval process
            Approval approval = timesheet.submitForApproval(lecturerId);

            // Then: System should create approval audit record and move to tutor verification stage
            assertThat(approval).isNotNull();
            assertThat(approval.getApproverId()).isEqualTo(lecturerId);
            assertThat(approval.getAction()).isEqualTo(ApprovalAction.SUBMIT_FOR_APPROVAL);
            assertThat(approval.getPreviousStatus()).isEqualTo(ApprovalStatus.DRAFT);
            assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(timesheet.getApprovals()).hasSize(1);
        }

        @Test
        @DisplayName("Business Rule Enforcement - Cannot submit already approved timesheet")
        void attemptToSubmitApprovedTimesheet_ShouldThrowBusinessException() {
            // Given: Timesheet is already in final approved state
            timesheet.setStatus(ApprovalStatus.FINAL_APPROVED);
            // When: Someone tries to submit an already approved timesheet
            // Then: System must reject this invalid business operation
            assertThatThrownBy(() -> timesheet.submitForApproval(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot submit timesheet that is not in editable state");
        }

        @Test
        @DisplayName("Tutor Verification Step - When tutor confirms work accuracy, should mark as tutor approved pending lecturer final approval")        void tutorConfirmsWorkAccuracy_ShouldAdvanceToHRPaymentApproval() {
            // Given: Lecturer-submitted timesheet awaiting tutor verification of work performed
            timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            Long tutorId = 2L; // Teaching assistant who actually performed the work
            String tutorComment = "Confirmed: I completed these teaching hours as documented";

            // When: Tutor verifies and confirms the accuracy of recorded work hours
            Approval approval = timesheet.approve(tutorId, tutorComment);

            // Then: System should record tutor confirmation and mark as tutor approved (lecturer final approval pending)
            assertThat(approval.getAction()).isEqualTo(ApprovalAction.APPROVE);
            assertThat(approval.getPreviousStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);
            assertThat(approval.getComment()).isEqualTo(tutorComment);
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);        }

        @Test
        @DisplayName("HR Payment Authorization - When HR approves verified timesheet, should authorize casual staff payment")
        void hrAuthorizesPayment_ShouldCompleteWorkflowAndTriggerPayrollProcessing() {
            // Given: Timesheet has been verified by tutor and awaits HR payment authorization
            timesheet.setStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);            Long hrManagerId = 3L; // HR department staff with payment authorization authority

            // When: HR approves the timesheet for payment processing (comment optional)
            Approval approval = timesheet.approve(hrManagerId, null);

            // Then: Timesheet should reach final approved state, ready for university payroll system
            assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.FINAL_APPROVED);
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.FINAL_APPROVED);        }

        @Test
        void approve_ShouldFailForNonApprovableStatus() {
            timesheet.setStatus(ApprovalStatus.DRAFT);

            assertThatThrownBy(() -> timesheet.approve(1L, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Timesheet cannot be approved in current state: DRAFT");
        }

        @Test
        void reject_ShouldCreateRejectionApproval() {
            timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            Long approverId = 2L;
            String comment = "Insufficient details";

            Approval approval = timesheet.reject(approverId, comment);

            assertThat(approval.getAction()).isEqualTo(ApprovalAction.REJECT);
            assertThat(approval.getPreviousStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.REJECTED);
            assertThat(approval.getComment()).isEqualTo(comment);
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
        }

        @Test
        void reject_ShouldFailWithoutComment() {
            timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);

            assertThatThrownBy(() -> timesheet.reject(1L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required");

            assertThatThrownBy(() -> timesheet.reject(1L, ""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required");

            assertThatThrownBy(() -> timesheet.reject(1L, "   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rejection comment is required");
        }

        @Test
        void requestModification_ShouldCreateModificationApproval() {
            timesheet.setStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);            Long approverId = 3L;
            String comment = "Please add more detail to description";

            Approval approval = timesheet.requestModification(approverId, comment);

            assertThat(approval.getAction()).isEqualTo(ApprovalAction.REQUEST_MODIFICATION);
            assertThat(approval.getPreviousStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);            assertThat(approval.getNewStatus()).isEqualTo(ApprovalStatus.MODIFICATION_REQUESTED);
            assertThat(approval.getComment()).isEqualTo(comment);
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.MODIFICATION_REQUESTED);
        }

        @Test
        void requestModification_ShouldFailWithoutComment() {
            timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);

            assertThatThrownBy(() -> timesheet.requestModification(1L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Modification request comment is required");
        }

        @Test
        void getMostRecentApproval_ShouldReturnLatestApproval() {
            timesheet.setStatus(ApprovalStatus.DRAFT);
            
            Approval approval1 = timesheet.submitForApproval(1L);
            Approval approval2 = timesheet.approve(2L, "Good work");

            Optional<Approval> mostRecent = timesheet.getMostRecentApproval();

            assertThat(mostRecent).isPresent();
            assertThat(mostRecent.get()).isSameAs(approval2);
        }

        @Test
        void getMostRecentApproval_ShouldReturnEmptyForNoApprovals() {
            Optional<Approval> mostRecent = timesheet.getMostRecentApproval();

            assertThat(mostRecent).isEmpty();
        }

        @Test
        void getApprovalHistory_ShouldReturnAllApprovals() {
            timesheet.setStatus(ApprovalStatus.DRAFT);
            
            timesheet.submitForApproval(1L);
            timesheet.approve(2L, "Approved by tutor");

            List<Approval> history = timesheet.getApprovalHistory();

            assertThat(history).hasSize(2);
            assertThat(history.get(0).getAction()).isEqualTo(ApprovalAction.SUBMIT_FOR_APPROVAL);
            assertThat(history.get(1).getAction()).isEqualTo(ApprovalAction.APPROVE);
        }

        @Test
        void hasApprovalAction_ShouldReturnTrueWhenActionExists() {
            timesheet.submitForApproval(1L);

            assertThat(timesheet.hasApprovalAction(ApprovalAction.SUBMIT_FOR_APPROVAL)).isTrue();
            assertThat(timesheet.hasApprovalAction(ApprovalAction.APPROVE)).isFalse();
        }

        @Test
        void getApprovalsByAction_ShouldReturnMatchingApprovals() {
            timesheet.setStatus(ApprovalStatus.DRAFT);
            timesheet.submitForApproval(1L);
            timesheet.approve(2L, "Tutor approval");
            timesheet.finalApprove(1L, "Lecturer final approval");

            List<Approval> approvals = timesheet.getApprovalsByAction(ApprovalAction.APPROVE);

            assertThat(approvals).hasSize(1);            assertThat(approvals).allMatch(a -> a.getAction() == ApprovalAction.APPROVE);
        }

        @Test
        void clearApprovals_ShouldRemoveAllApprovals() {
            timesheet.submitForApproval(1L);
            assertThat(timesheet.getApprovals()).hasSize(1);

            timesheet.clearApprovals();

            assertThat(timesheet.getApprovals()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Week Period Management Tests")
    class WeekPeriodTests {

        @Test
        void setWeekStartDate_ShouldCreateNewWeekPeriod() {
            LocalDate newDate = LocalDate.of(2024, 2, 5); // Monday
            
            timesheet.setWeekStartDate(newDate);

            assertThat(timesheet.getWeekStartDate()).isEqualTo(newDate);
            assertThat(timesheet.getWeekPeriod()).isNotNull();
        }

        @Test
        void getWeekStartDate_ShouldReturnNullWhenWeekPeriodIsNull() {
            timesheet.setWeekPeriod(null);

            assertThat(timesheet.getWeekStartDate()).isNull();
        }
    }

    @Nested
    @DisplayName("Money Compatibility Tests")
    class MoneyCompatibilityTests {

        @Test
        void setHourlyRateWithBigDecimal_ShouldCreateMoneyObject() {
            BigDecimal rate = new BigDecimal("30.50");
            
            timesheet.setHourlyRate(rate);

            assertThat(timesheet.getHourlyRate()).isEqualByComparingTo(rate);
            assertThat(timesheet.getHourlyRateMoney().getAmount()).isEqualByComparingTo(rate);
        }

        @Test
        void getHourlyRate_ShouldReturnBigDecimalFromMoney() {
            Money money = new Money(new BigDecimal("45.75"));
            timesheet.setHourlyRate(money);

            assertThat(timesheet.getHourlyRate()).isEqualByComparingTo(new BigDecimal("45.75"));
        }

        @Test
        void getHourlyRate_ShouldReturnNullWhenMoneyIsNull() {
            timesheet.setHourlyRate((Money) null);

            assertThat(timesheet.getHourlyRate()).isNull();
        }
    }

    @Nested
    @DisplayName("Complex Approval Workflows")
    class ComplexApprovalWorkflowTests {

        @Test
        void completeCasualStaffPaymentWorkflow_ShouldFollowUniversityApprovalProcess() {
            // Start with lecturer creating draft timesheet for casual staff payment
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
            assertThat(timesheet.isEditable()).isTrue();

            // Lecturer submits timesheet documenting casual staff work
            timesheet.submitForApproval(1L); // Lecturer ID
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(timesheet.canBeApproved()).isTrue();

            // Tutor/Teaching Assistant confirms work accuracy
            timesheet.approve(2L, "Confirmed: I performed these teaching duties as documented");
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);
            assertThat(timesheet.canBeApproved()).isFalse();

            // Lecturer gives final academic approval
            timesheet.finalApprove(1L, "Lecturer final approval");
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);            assertThat(timesheet.canBeApproved()).isTrue();

            // HR authorizes payment for casual academic staff
            timesheet.approve(3L, "Approved for payroll processing");
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.FINAL_APPROVED);            assertThat(timesheet.canBeApproved()).isFalse();

            // Verify complete audit trail for university finance compliance
            List<Approval> history = timesheet.getApprovalHistory();
            assertThat(history).hasSize(4);
            assertThat(history.get(0).getAction()).isEqualTo(ApprovalAction.SUBMIT_FOR_APPROVAL);
            assertThat(history.get(1).getAction()).isEqualTo(ApprovalAction.APPROVE);
            assertThat(history.get(2).getAction()).isEqualTo(ApprovalAction.FINAL_APPROVAL);        }

        @Test
        void rejectionWorkflow_ShouldWorkCorrectly() {
            timesheet.submitForApproval(1L);
            timesheet.reject(2L, "Needs more detail");

            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
            assertThat(timesheet.isEditable()).isFalse();
            assertThat(timesheet.canBeApproved()).isFalse();

            List<Approval> history = timesheet.getApprovalHistory();
            assertThat(history).hasSize(2);
            assertThat(history.get(1).getAction()).isEqualTo(ApprovalAction.REJECT);
            assertThat(history.get(1).getComment()).isEqualTo("Needs more detail");
        }

        @Test
        void modificationRequestWorkflow_ShouldWorkCorrectly() {
            timesheet.submitForApproval(1L);
            timesheet.requestModification(2L, "Please add more hours detail");

            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.MODIFICATION_REQUESTED);
            assertThat(timesheet.isEditable()).isTrue();
            assertThat(timesheet.canBeApproved()).isFalse();

            // Can resubmit after modification
            timesheet.submitForApproval(1L);
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
        }
    }
}