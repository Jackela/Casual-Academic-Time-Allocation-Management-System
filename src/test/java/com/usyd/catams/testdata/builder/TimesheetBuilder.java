package com.usyd.catams.testdata.builder;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Builder for {@link Timesheet} entities for testing purposes.
 * Provides sensible defaults and fluent API for customization.
 */
public class TimesheetBuilder {

    private Long id = 1L;
    private Long tutorId = 2L;
    private Long courseId = 100L;
    private LocalDate weekStartDate = LocalDate.now().minusWeeks(1).with(java.time.DayOfWeek.MONDAY);
    private BigDecimal hours = new BigDecimal("10.0");
    private BigDecimal hourlyRate = new BigDecimal("45.00");
    private String description = "Test timesheet description";
    private Long createdBy = 1L;
    private ApprovalStatus status = ApprovalStatus.DRAFT;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public TimesheetBuilder() {
    }

    public TimesheetBuilder withId(Long id) {
        this.id = id;
        return this;
    }

    public TimesheetBuilder withTutorId(Long tutorId) {
        this.tutorId = tutorId;
        return this;
    }

    public TimesheetBuilder withTutor(User tutor) {
        this.tutorId = tutor.getId();
        return this;
    }

    public TimesheetBuilder withCourseId(Long courseId) {
        this.courseId = courseId;
        return this;
    }

    public TimesheetBuilder withWeekStartDate(LocalDate weekStartDate) {
        this.weekStartDate = weekStartDate;
        return this;
    }

    public TimesheetBuilder withHours(BigDecimal hours) {
        this.hours = hours;
        return this;
    }

    public TimesheetBuilder withHourlyRate(BigDecimal hourlyRate) {
        this.hourlyRate = hourlyRate;
        return this;
    }

    public TimesheetBuilder withDescription(String description) {
        this.description = description;
        return this;
    }

    public TimesheetBuilder withCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
        return this;
    }

    public TimesheetBuilder withStatus(ApprovalStatus status) {
        this.status = status;
        return this;
    }

    public TimesheetBuilder asDraft() {
        this.status = ApprovalStatus.DRAFT;
        return this;
    }

    public TimesheetBuilder asPendingTutorReview() {
        this.status = ApprovalStatus.PENDING_TUTOR_REVIEW;
        return this;
    }

    public TimesheetBuilder asApprovedByTutor() {
        this.status = ApprovalStatus.APPROVED_BY_TUTOR;
        return this;
    }

    public TimesheetBuilder asRejected() {
        this.status = ApprovalStatus.REJECTED;
        return this;
    }

    public Timesheet build() {
        Timesheet timesheet = new Timesheet(
            tutorId,
            courseId,
            new WeekPeriod(weekStartDate),
            hours,
            new Money(hourlyRate),
            description,
            createdBy
        );
        timesheet.setId(id);
        timesheet.setStatus(status);
        timesheet.setCreatedAt(createdAt);
        timesheet.setUpdatedAt(updatedAt);
        return timesheet;
    }
}
