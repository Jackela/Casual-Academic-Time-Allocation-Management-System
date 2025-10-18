
package com.usyd.catams.testdata.builder;

import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.DayOfWeek;

/**
 * Builder for {@link TimesheetCreateRequest} DTOs for testing purposes.
 * Provides sensible defaults and fluent API for customization.
 */
public class TimesheetCreateRequestBuilder {

    private Long tutorId = 2L;
    private Long courseId = 100L;
    private LocalDate weekStartDate = LocalDate.now().with(DayOfWeek.MONDAY);
    private BigDecimal hours = new BigDecimal("10.0");
    private BigDecimal hourlyRate = new BigDecimal("45.00");
    private String description = "Test timesheet description";
    private TimesheetTaskType taskType = TimesheetTaskType.TUTORIAL;
    private TutorQualification qualification = TutorQualification.STANDARD;
    private boolean repeat = false;
    private BigDecimal deliveryHours = new BigDecimal("10.0");
    private LocalDate sessionDate = weekStartDate;

    public TimesheetCreateRequestBuilder() {
    }

    public TimesheetCreateRequestBuilder withTutorId(Long tutorId) {
        this.tutorId = tutorId;
        return this;
    }

    public TimesheetCreateRequestBuilder withCourseId(Long courseId) {
        this.courseId = courseId;
        return this;
    }

    public TimesheetCreateRequestBuilder withWeekStartDate(LocalDate weekStartDate) {
        this.weekStartDate = weekStartDate;
        this.sessionDate = weekStartDate;
        return this;
    }

    public TimesheetCreateRequestBuilder withHours(BigDecimal hours) {
        this.hours = hours;
        this.deliveryHours = hours;
        return this;
    }

    public TimesheetCreateRequestBuilder withHourlyRate(BigDecimal hourlyRate) {
        this.hourlyRate = hourlyRate;
        return this;
    }

    public TimesheetCreateRequestBuilder withDescription(String description) {
        this.description = description;
        return this;
    }

    public TimesheetCreateRequestBuilder withTaskType(TimesheetTaskType taskType) {
        this.taskType = taskType;
        return this;
    }

    public TimesheetCreateRequestBuilder withQualification(TutorQualification qualification) {
        this.qualification = qualification;
        return this;
    }

    public TimesheetCreateRequestBuilder repeat(boolean repeat) {
        this.repeat = repeat;
        return this;
    }

    public TimesheetCreateRequestBuilder withDeliveryHours(BigDecimal deliveryHours) {
        this.deliveryHours = deliveryHours;
        return this;
    }

    public TimesheetCreateRequestBuilder withSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate;
        return this;
    }

    public TimesheetCreateRequest build() {
        TimesheetCreateRequest request = new TimesheetCreateRequest();
        request.setTutorId(tutorId);
        request.setCourseId(courseId);
        request.setWeekStartDate(weekStartDate); // Corrected setter call
        request.setHours(hours);
        request.setHourlyRate(hourlyRate);
        request.setDescription(description);
        request.setTaskType(taskType);
        request.setQualification(qualification);
        request.setRepeat(repeat);
        request.setDeliveryHours(deliveryHours != null ? deliveryHours : hours);
        request.setSessionDate(sessionDate != null ? sessionDate : weekStartDate);
        return request;
    }
}

