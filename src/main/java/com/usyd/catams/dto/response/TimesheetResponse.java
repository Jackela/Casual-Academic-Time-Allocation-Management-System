package com.usyd.catams.dto.response;

import com.usyd.catams.enums.ApprovalStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO for timesheet data.
 * 
 * This DTO represents the structure returned by the API for timesheet queries
 * according to the OpenAPI specification. Includes success field for consistent
 * API response format.
 */
public class TimesheetResponse {

    @JsonProperty("success")
    private boolean success = true;

    @JsonProperty("id")
    private Long id;

    @JsonProperty("tutorId")
    private Long tutorId;

    @JsonProperty("courseId")
    private Long courseId;

    @JsonProperty("weekStartDate")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate weekStartDate;

    @JsonProperty("hours")
    private BigDecimal hours;

    @JsonProperty("hourlyRate")
    private BigDecimal hourlyRate;

    @JsonProperty("totalPay")
    private BigDecimal totalPay;

    @JsonProperty("description")
    private String description;

    @JsonProperty("status")
    private ApprovalStatus status;

    @JsonProperty("createdAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonProperty("updatedAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @JsonProperty("createdBy")
    private Long createdBy;

    // Additional computed fields for API response
    @JsonProperty("isEditable")
    private Boolean isEditable;

    @JsonProperty("canBeApproved")
    private Boolean canBeApproved;

    // Default constructor
    public TimesheetResponse() {
    }

    // Full constructor
    public TimesheetResponse(Long id, Long tutorId, Long courseId, LocalDate weekStartDate,
                           BigDecimal hours, BigDecimal hourlyRate, String description,
                           ApprovalStatus status, LocalDateTime createdAt, LocalDateTime updatedAt,
                           Long createdBy) {
        this.success = true;
        this.id = id;
        this.tutorId = tutorId;
        this.courseId = courseId;
        this.weekStartDate = weekStartDate;
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        
        // Calculate computed fields
        this.totalPay = calculateTotalPay();
        this.isEditable = calculateIsEditable();
        this.canBeApproved = calculateCanBeApproved();
    }

    // Getters and Setters
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
        this.totalPay = calculateTotalPay(); // Recalculate when hours change
    }

    public BigDecimal getHourlyRate() {
        return hourlyRate;
    }

    public void setHourlyRate(BigDecimal hourlyRate) {
        this.hourlyRate = hourlyRate;
        this.totalPay = calculateTotalPay(); // Recalculate when rate changes
    }

    public BigDecimal getTotalPay() {
        return totalPay;
    }

    public void setTotalPay(BigDecimal totalPay) {
        this.totalPay = totalPay;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ApprovalStatus getStatus() {
        return status;
    }

    public void setStatus(ApprovalStatus status) {
        this.status = status;
        this.isEditable = calculateIsEditable(); // Recalculate when status changes
        this.canBeApproved = calculateCanBeApproved();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Boolean getIsEditable() {
        return isEditable;
    }

    public void setIsEditable(Boolean isEditable) {
        this.isEditable = isEditable;
    }

    public Boolean getCanBeApproved() {
        return canBeApproved;
    }

    public void setCanBeApproved(Boolean canBeApproved) {
        this.canBeApproved = canBeApproved;
    }

    // Business logic methods
    private BigDecimal calculateTotalPay() {
        if (hours == null || hourlyRate == null) {
            return BigDecimal.ZERO;
        }
        return hours.multiply(hourlyRate);
    }

    private Boolean calculateIsEditable() {
        if (status == null) {
            return false;
        }
        return status.isEditable();
    }

    private Boolean calculateCanBeApproved() {
        if (status == null) {
            return false;
        }
        return status.isPending();
    }

    @Override
    public String toString() {
        return "TimesheetResponse{" +
                "id=" + id +
                ", tutorId=" + tutorId +
                ", courseId=" + courseId +
                ", weekStartDate=" + weekStartDate +
                ", hours=" + hours +
                ", hourlyRate=" + hourlyRate +
                ", totalPay=" + totalPay +
                ", description='" + description + '\'' +
                ", status=" + status +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                ", createdBy=" + createdBy +
                ", isEditable=" + isEditable +
                ", canBeApproved=" + canBeApproved +
                '}';
    }
}