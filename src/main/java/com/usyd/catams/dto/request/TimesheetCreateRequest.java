package com.usyd.catams.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
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
 * - deliveryHours: Required, between 0.1 and 10.0 (1 decimal place)
 * - description: Required, 1-1000 characters
 * - taskType: Required enumeration value
 * - qualification: Required enumeration value
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

    @NotBlank(message = "Description is required")
    @Size(min = 1, max = 1000, message = "Description must be between 1 and 1000 characters")
    private String description;

    @NotNull(message = "Task type is required")
    private TimesheetTaskType taskType = TimesheetTaskType.TUTORIAL;

    private Boolean isRepeat = Boolean.FALSE;

    @NotNull(message = "Qualification is required")
    private TutorQualification qualification = TutorQualification.STANDARD;

    @NotNull(message = "Delivery hours is required")
    @DecimalMin(value = "0.1", message = "Delivery hours must be at least 0.1")
    @DecimalMax(value = "10.0", message = "Delivery hours cannot exceed 10.0")
    @Digits(integer = 2, fraction = 1, message = "Delivery hours must have at most 1 decimal place")
    private BigDecimal deliveryHours;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate sessionDate;

    // Default constructor
    public TimesheetCreateRequest() {
    }

    // Constructor for testing
    public TimesheetCreateRequest(Long tutorId, Long courseId, LocalDate weekStartDate,
                                BigDecimal deliveryHours, String description) {
        this.tutorId = tutorId;
        this.courseId = courseId;
        this.weekStartDate = weekStartDate;
        this.description = description;
        this.deliveryHours = deliveryHours;
        this.sessionDate = weekStartDate;
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

    public void setRepeat(Boolean repeat) {
        this.isRepeat = repeat;
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

    @JsonIgnore
    public LocalDate resolveSessionDate() {
        return sessionDate != null ? sessionDate : weekStartDate;
    }

    @Override
    public String toString() {
        return "TimesheetCreateRequest{" +
                "tutorId=" + tutorId +
                ", courseId=" + courseId +
                ", weekStartDate=" + weekStartDate +
                ", deliveryHours=" + deliveryHours +
                ", description='" + description + '\'' +
                '}';
    }
}
