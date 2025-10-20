package com.usyd.catams.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Request DTO for updating an existing timesheet.
 * 
 * This DTO contains the fields that can be updated in a timesheet:
 * hours, hourlyRate, and description. All validation constraints
 * match those defined in the Timesheet entity and OpenAPI specification.
 * 
 * Based on OpenAPI schema: TimesheetUpdateRequest
 */
public class TimesheetUpdateRequest {

    /**
     * Number of hours worked.
     * Must be between 0.1 and 40.0 with at most 1 decimal place.
     */
    @NotNull(message = "Hours is required")
    @DecimalMin(value = "0.1", message = "Hours must be at least 0.1")
    @DecimalMax(value = "40.0", message = "Hours cannot exceed 40.0")
    @Digits(integer = 2, fraction = 1, message = "Hours must have at most 1 decimal place")
    private BigDecimal hours;

    /**
     * Hourly rate for the work performed.
     * Must be between 10.00 and 200.00 with exactly 2 decimal places.
     */
    @NotNull(message = "Hourly rate is required")
    @DecimalMin(value = "10.00", message = "Hourly rate must be at least 10.00")
    @DecimalMax(value = "200.00", message = "Hourly rate cannot exceed 200.00")
    @Digits(integer = 3, fraction = 2, message = "Hourly rate must have exactly 2 decimal places")
    private BigDecimal hourlyRate;

    /**
     * Description of the work performed.
     * Must not be blank and cannot exceed 1000 characters.
     */
    @NotBlank(message = "Description is required")
    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @NotNull(message = "Task type is required")
    private TimesheetTaskType taskType = TimesheetTaskType.TUTORIAL;

    private Boolean repeat = Boolean.FALSE;

    @NotNull(message = "Qualification is required")
    private TutorQualification qualification = TutorQualification.STANDARD;

    @NotNull(message = "Delivery hours is required")
    @DecimalMin(value = "0.1", message = "Delivery hours must be at least 0.1")
    @DecimalMax(value = "10.0", message = "Delivery hours cannot exceed 10.0")
    @Digits(integer = 2, fraction = 1, message = "Delivery hours must have at most 1 decimal place")
    private BigDecimal deliveryHours;

    @NotNull(message = "Session date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate sessionDate;

    // Default constructor
    public TimesheetUpdateRequest() {
    }

    /**
     * Constructor with all fields.
     * 
     * @param hours number of hours worked
     * @param hourlyRate hourly rate for the work
     * @param description description of work performed
     */
    public TimesheetUpdateRequest(BigDecimal hours, BigDecimal hourlyRate, String description) {
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.description = description;
    }

    // Getters and Setters

    public BigDecimal getHours() {
        return hours;
    }

    public void setHours(BigDecimal hours) {
        BigDecimal previousHours = this.hours;
        this.hours = hours;
        if (deliveryHours == null || (previousHours != null && previousHours.compareTo(deliveryHours) == 0)) {
            this.deliveryHours = hours;
        }
    }

    public BigDecimal getHourlyRate() {
        return hourlyRate;
    }

    public void setHourlyRate(BigDecimal hourlyRate) {
        if (hourlyRate == null) {
            this.hourlyRate = null;
        } else {
            this.hourlyRate = hourlyRate.setScale(2, RoundingMode.HALF_UP);
        }
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TimesheetTaskType getTaskType() {
        return taskType;
    }

    public void setTaskType(TimesheetTaskType taskType) {
        this.taskType = taskType;
    }

    public boolean isRepeat() {
        return Boolean.TRUE.equals(repeat);
    }

    public void setRepeat(Boolean repeat) {
        this.repeat = repeat;
    }

    public TutorQualification getQualification() {
        return qualification;
    }

    public void setQualification(TutorQualification qualification) {
        this.qualification = qualification;
    }

    public BigDecimal getDeliveryHours() {
        return deliveryHours != null ? deliveryHours : hours;
    }

    public void setDeliveryHours(BigDecimal deliveryHours) {
        this.deliveryHours = deliveryHours;
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public void setSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate;
    }

    /**
     * Validate all business rules for the update request.
     * 
     * @throws IllegalArgumentException if validation fails
     */
    public void validateBusinessRules() {
        if (hours == null || hours.compareTo(BigDecimal.valueOf(0.1)) < 0 || hours.compareTo(BigDecimal.valueOf(40.0)) > 0) {
            throw new IllegalArgumentException("Hours must be between 0.1 and 40.0");
        }

        if (hourlyRate == null || hourlyRate.compareTo(BigDecimal.valueOf(10.00)) < 0 || 
            hourlyRate.compareTo(BigDecimal.valueOf(200.00)) > 0) {
            throw new IllegalArgumentException("Hourly rate must be between 10.00 and 200.00");
        }

        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Description cannot be empty");
        }

        if (description.length() > 1000) {
            throw new IllegalArgumentException("Description cannot exceed 1000 characters");
        }
    }

    @Override
    public String toString() {
        return "TimesheetUpdateRequest{" +
                "hours=" + hours +
                ", hourlyRate=" + hourlyRate +
                ", description='" + description + '\'' +
                '}';
    }
}
