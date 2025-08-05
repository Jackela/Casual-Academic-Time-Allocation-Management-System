package com.usyd.catams.test.fixture;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Currency;

/**
 * Test fixture for creating Timesheet entities in various business scenarios.
 * 
 * This fixture abstracts the complexity of test data setup and focuses on business
 * scenarios rather than specific status values. It follows the DDD principle of
 * expressing domain concepts in the test code.
 * 
 * Usage examples:
 * - createPendingApprovalScenario() - Creates a timesheet awaiting tutor review
 * - createReadyForHRScenario() - Creates a timesheet ready for HR review
 * - createCompletedWorkflowScenario() - Creates a fully approved timesheet
 * 
 * @author Development Team
 * @since 1.1
 */
public class TimesheetWorkflowTestFixture {
    
    // Test data constants - centralized for consistency
    private static final Long DEFAULT_TUTOR_ID = 1001L;
    private static final Long DEFAULT_COURSE_ID = 2001L;
    private static final Long DEFAULT_CREATOR_ID = 1001L;
    private static final BigDecimal DEFAULT_HOURS = new BigDecimal("20.0");
    private static final Money DEFAULT_HOURLY_RATE = new Money(new BigDecimal("50.00"), Currency.getInstance("AUD"));
    private static final String DEFAULT_DESCRIPTION = "Weekly tutorial sessions";
    
    /**
     * Creates a timesheet in draft state - can be edited and submitted.
     * 
     * Business scenario: Lecturer has created a timesheet but hasn't submitted it yet.
     * Expected behaviors: isEditable() = true, canBeSubmitted() = true
     */
    public static Timesheet createDraftScenario() {
        return new Timesheet(
            DEFAULT_TUTOR_ID,
            DEFAULT_COURSE_ID,
            createDefaultWeekPeriod(),
            DEFAULT_HOURS,
            DEFAULT_HOURLY_RATE,
            DEFAULT_DESCRIPTION,
            DEFAULT_CREATOR_ID
        );
        // Note: Constructor sets status to DRAFT automatically
    }
    
    /**
     * Creates a timesheet awaiting tutor approval.
     * 
     * Business scenario: Lecturer has submitted timesheet, now awaiting tutor review.
     * Expected behaviors: isEditable() = false, canBeApproved() = true, requiresAction() = true
     */
    public static Timesheet createPendingApprovalScenario() {
        Timesheet timesheet = createDraftScenario();
        timesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
        return timesheet;
    }
    
    /**
     * Creates a timesheet that has been approved by tutor and is ready for HR review.
     * 
     * Business scenario: Tutor has approved, system automatically moves to HR queue.
     * Expected behaviors: isEditable() = false, canBeApproved() = true, isReadyForHR() = true
     */
    public static Timesheet createReadyForHRScenario() {
        Timesheet timesheet = createDraftScenario();
        timesheet.setStatus(ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR);
        return timesheet;
    }
    
    /**
     * Creates a timesheet in the intermediate tutor-approved state.
     * 
     * Business scenario: Tutor has just approved, before automatic HR transition.
     * Expected behaviors: isEditable() = false, canBeApproved() = false, isIntermediate() = true
     */
    public static Timesheet createTutorApprovedScenario() {
        Timesheet timesheet = createDraftScenario();
        timesheet.setStatus(ApprovalStatus.APPROVED_BY_TUTOR);
        return timesheet;
    }
    
    /**
     * Creates a fully approved timesheet.
     * 
     * Business scenario: Both tutor and HR have approved - workflow complete.
     * Expected behaviors: isEditable() = false, canBeApproved() = false, isFinal() = true
     */
    public static Timesheet createCompletedWorkflowScenario() {
        Timesheet timesheet = createDraftScenario();
        timesheet.setStatus(ApprovalStatus.FINAL_APPROVED);
        return timesheet;
    }
    
    /**
     * Creates a timesheet that requires modifications.
     * 
     * Business scenario: Reviewer has requested changes from the creator.
     * Expected behaviors: isEditable() = true, canBeResubmitted() = true, requiresAttention() = true
     */
    public static Timesheet createRequiresModificationScenario() {
        Timesheet timesheet = createDraftScenario();
        timesheet.setStatus(ApprovalStatus.MODIFICATION_REQUESTED);
        return timesheet;
    }
    
    /**
     * Creates a rejected timesheet.
     * 
     * Business scenario: Reviewer has rejected the timesheet submission.
     * Expected behaviors: isEditable() = true, canBeResubmitted() = true, wasRejected() = true
     */
    public static Timesheet createRejectedScenario() {
        Timesheet timesheet = createDraftScenario();
        timesheet.setStatus(ApprovalStatus.REJECTED);
        return timesheet;
    }
    
    /**
     * Creates a timesheet builder for more complex test scenarios.
     * 
     * @return TimesheetTestBuilder for fluent test data creation
     */
    public static TimesheetTestBuilder aTimesheet() {
        return new TimesheetTestBuilder();
    }
    
    /**
     * Creates a default week period for testing (current Monday).
     */
    private static WeekPeriod createDefaultWeekPeriod() {
        LocalDate monday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        return new WeekPeriod(monday);
    }
    
    /**
     * Fluent builder for more complex timesheet test scenarios.
     */
    public static class TimesheetTestBuilder {
        private Long tutorId = DEFAULT_TUTOR_ID;
        private Long courseId = DEFAULT_COURSE_ID;
        private WeekPeriod weekPeriod = createDefaultWeekPeriod();
        private BigDecimal hours = DEFAULT_HOURS;
        private Money hourlyRate = DEFAULT_HOURLY_RATE;
        private String description = DEFAULT_DESCRIPTION;
        private Long createdBy = DEFAULT_CREATOR_ID;
        private ApprovalStatus status = ApprovalStatus.DRAFT;
        
        public TimesheetTestBuilder withTutor(Long tutorId) {
            this.tutorId = tutorId;
            return this;
        }
        
        public TimesheetTestBuilder withCourse(Long courseId) {
            this.courseId = courseId;
            return this;
        }
        
        public TimesheetTestBuilder withHours(BigDecimal hours) {
            this.hours = hours;
            return this;
        }
        
        public TimesheetTestBuilder withHourlyRate(BigDecimal rate) {
            this.hourlyRate = new Money(rate, Currency.getInstance("AUD"));
            return this;
        }
        
        public TimesheetTestBuilder withDescription(String description) {
            this.description = description;
            return this;
        }
        
        public TimesheetTestBuilder inDraftState() {
            this.status = ApprovalStatus.DRAFT;
            return this;
        }
        
        public TimesheetTestBuilder awaitingTutorReview() {
            this.status = ApprovalStatus.PENDING_TUTOR_REVIEW;
            return this;
        }
        
        public TimesheetTestBuilder readyForHRApproval() {
            this.status = ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR;
            return this;
        }
        
        public TimesheetTestBuilder fullyApproved() {
            this.status = ApprovalStatus.FINAL_APPROVED;
            return this;
        }
        
        public TimesheetTestBuilder requiresModification() {
            this.status = ApprovalStatus.MODIFICATION_REQUESTED;
            return this;
        }
        
        public TimesheetTestBuilder rejected() {
            this.status = ApprovalStatus.REJECTED;
            return this;
        }
        
        public Timesheet build() {
            Timesheet timesheet = new Timesheet(tutorId, courseId, weekPeriod, hours, hourlyRate, description, createdBy);
            if (status != ApprovalStatus.DRAFT) {
                timesheet.setStatus(status);
            }
            return timesheet;
        }
    }
}
