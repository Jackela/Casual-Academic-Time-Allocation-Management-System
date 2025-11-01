package com.usyd.catams.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request DTO for updating an existing timesheet.
 * 
 * This DTO contains the fields that can be updated in a timesheet:
 * delivery hours, description, task metadata, and scheduling details.
 * All validation constraints match those defined in the Timesheet entity
 * and OpenAPI specification.
 * 
 * Based on OpenAPI schema: TimesheetUpdateRequest
 */
public class TimesheetUpdateRequest {

    /**
     * Description of the work performed.
     * Must not be blank and cannot exceed 1000 characters.
     */
    @NotBlank(message = "Description is required")
    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @NotNull(message = "Task type is required")
    private TimesheetTaskType taskType = TimesheetTaskType.TUTORIAL;

    @com.fasterxml.jackson.annotation.JsonProperty("isRepeat")
    private Boolean isRepeat = Boolean.FALSE;

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
     * Convenience constructor for tests.
     *
     * @param deliveryHours calculated delivery hours to apply
     * @param description description of work performed
     */
    public TimesheetUpdateRequest(BigDecimal deliveryHours, String description) {
        this.deliveryHours = deliveryHours;
        this.description = description;
    }

    // Getters and Setters

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
        return Boolean.TRUE.equals(isRepeat);
    }

    public void setIsRepeat(Boolean isRepeat) {
        this.isRepeat = isRepeat;
    }

    public TutorQualification getQualification() {
        return qualification;
    }

    public void setQualification(TutorQualification qualification) {
        this.qualification = qualification;
    }

    public BigDecimal getDeliveryHours() {
        return deliveryHours;
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
        if (deliveryHours == null
                || deliveryHours.compareTo(BigDecimal.valueOf(0.1)) < 0
                || deliveryHours.compareTo(BigDecimal.valueOf(10.0)) > 0) {
            throw new IllegalArgumentException("Delivery hours must be between 0.1 and 10.0");
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
                "deliveryHours=" + deliveryHours +
                ", description='" + description + '\'' +
                '}';
    }
}
