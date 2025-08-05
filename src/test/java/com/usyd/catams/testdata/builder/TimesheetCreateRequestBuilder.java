
package com.usyd.catams.testdata.builder;

import com.usyd.catams.dto.request.TimesheetCreateRequest;

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
        return this;
    }

    public TimesheetCreateRequestBuilder withHours(BigDecimal hours) {
        this.hours = hours;
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

    public TimesheetCreateRequest build() {
        TimesheetCreateRequest request = new TimesheetCreateRequest();
        request.setTutorId(tutorId);
        request.setCourseId(courseId);
        request.setWeekStartDate(weekStartDate); // Corrected setter call
        request.setHours(hours);
        request.setHourlyRate(hourlyRate);
        request.setDescription(description);
        return request;
    }
}

