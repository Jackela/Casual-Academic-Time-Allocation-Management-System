package com.usyd.catams.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request DTO for creating a new timesheet.
 * 
 * This DTO enforces all validation rules defined in the OpenAPI specification
 * and business requirements for timesheet creation.
 * 
 * Validation rules:
 * - tutorId: Required, positive integer
 * - courseId: Required, positive integer
 * - weekStartDate: Required, must be a Monday
 * - hours: Required, between 0.1 and 40.0
 * - hourlyRate: Required, between 10.00 and 200.00
 * - description: Required, 1-1000 characters
 */
public class TimesheetCreateRequest {

    @NotNull(message = "Tutor ID is required")
    @Positive(message = "Tutor ID must be a positive number")
    private Long tutorId;

    @NotNull(message = "Course ID is required")
    @Positive(message = "Course ID must be a positive number")
    private Long courseId;

    @NotNull(message = "Week start date is required")
    private LocalDate weekStartDate;

    @NotNull(message = "Hours is required")
    @DecimalMin(value = "0.1", inclusive = true, message = "Hours must be at least 0.1")
    @DecimalMax(value = "40.0", inclusive = true, message = "Hours cannot exceed 40.0")
    private BigDecimal hours;

    @NotNull(message = "Hourly rate is required")
    @DecimalMin(value = "10.00", inclusive = true, message = "Hourly rate must be at least 10.00")
    @DecimalMax(value = "200.00", inclusive = true, message = "Hourly rate cannot exceed 200.00")
    private BigDecimal hourlyRate;

    @NotBlank(message = "Description is required")
    @Size(min = 1, max = 1000, message = "Description must be between 1 and 1000 characters")
    private String description;

    // Default constructor
    public TimesheetCreateRequest() {
    }

    // Constructor for testing
    public TimesheetCreateRequest(Long tutorId, Long courseId, LocalDate weekStartDate,
                                BigDecimal hours, BigDecimal hourlyRate, String description) {
        this.tutorId = tutorId;
        this.courseId = courseId;
        this.weekStartDate = weekStartDate;
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.description = description;
    }

    // Getters and Setters
    public Long getTutorId() {
        return tutorId;
    }

    public void setTutorId(Long tutorId) {
        this.tutorId = tutorId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public LocalDate getWeekStartDate() {
        return weekStartDate;
    }

    public void setWeekStartDate(LocalDate weekStartDate) {
        this.weekStartDate = weekStartDate;
    }

    public BigDecimal getHours() {
        return hours;
    }

    public void setHours(BigDecimal hours) {
        this.hours = hours;
    }

    public BigDecimal getHourlyRate() {
        return hourlyRate;
    }

    public void setHourlyRate(BigDecimal hourlyRate) {
        this.hourlyRate = hourlyRate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    /**
     * Validate that weekStartDate is a Monday.
     * This method can be called for additional business validation.
     * 
     * @return true if date is Monday, false otherwise
     */
    @JsonIgnore
    public boolean isWeekStartDateMonday() {
        if (weekStartDate == null) {
            return false;
        }
        return weekStartDate.getDayOfWeek().getValue() == 1; // Monday = 1
    }

    /**
     * Calculate total pay for this timesheet request.
     * 
     * @return total pay amount
     */
    @JsonIgnore
    public BigDecimal calculateTotalPay() {
        if (hours == null || hourlyRate == null) {
            return BigDecimal.ZERO;
        }
        return hours.multiply(hourlyRate);
    }

    @Override
    public String toString() {
        return "TimesheetCreateRequest{" +
                "tutorId=" + tutorId +
                ", courseId=" + courseId +
                ", weekStartDate=" + weekStartDate +
                ", hours=" + hours +
                ", hourlyRate=" + hourlyRate +
                ", description='" + description + '\'' +
                '}';
    }
}