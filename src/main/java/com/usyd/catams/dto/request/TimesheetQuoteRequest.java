package com.usyd.catams.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request payload for the Schedule 1 quote endpoint.
 */
public class TimesheetQuoteRequest {

    @NotNull
    private Long tutorId;

    @NotNull
    private Long courseId;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate sessionDate;

    @NotNull
    private TimesheetTaskType taskType;

    private TutorQualification qualification = TutorQualification.STANDARD;

    private Boolean repeat = Boolean.FALSE;

    @NotNull
    @DecimalMin(value = "0.1", message = "Delivery hours must be at least 0.1")
    @DecimalMax(value = "10.0", message = "Delivery hours cannot exceed 10.0")
    @Digits(integer = 2, fraction = 1, message = "Delivery hours must have at most 1 decimal place")
    private BigDecimal deliveryHours;

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

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public void setSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate;
    }

    public TimesheetTaskType getTaskType() {
        return taskType;
    }

    public void setTaskType(TimesheetTaskType taskType) {
        this.taskType = taskType;
    }

    public TutorQualification getQualification() {
        return qualification;
    }

    public void setQualification(TutorQualification qualification) {
        this.qualification = qualification;
    }

    public boolean isRepeat() {
        return Boolean.TRUE.equals(repeat);
    }

    public void setRepeat(Boolean repeat) {
        this.repeat = repeat;
    }

    public BigDecimal getDeliveryHours() {
        return deliveryHours;
    }

    public void setDeliveryHours(BigDecimal deliveryHours) {
        this.deliveryHours = deliveryHours;
    }
}
