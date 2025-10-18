package com.usyd.catams.dto.response;

import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.math.RoundingMode;
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


    @JsonProperty("id")
    private Long id;

    @JsonProperty("tutorId")
    private Long tutorId;

    @JsonProperty("tutorName")
    private String tutorName;

    @JsonProperty("courseId")
    private Long courseId;

    @JsonProperty("courseName")
    private String courseName;

    @JsonProperty("weekStartDate")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate weekStartDate;

    @JsonProperty("hours")
    private BigDecimal hours;

    @JsonProperty("hourlyRate")
    private BigDecimal hourlyRate;

    @JsonProperty("deliveryHours")
    private BigDecimal deliveryHours;

    @JsonProperty("associatedHours")
    private BigDecimal associatedHours;

    @JsonProperty("totalPay")
    private BigDecimal totalPay;

    @JsonProperty("taskType")
    private TimesheetTaskType taskType;

    @JsonProperty("isRepeat")
    private Boolean repeat;

    @JsonProperty("qualification")
    private TutorQualification qualification;

    @JsonProperty("rateCode")
    private String rateCode;

    @JsonProperty("calculationFormula")
    private String calculationFormula;

    @JsonProperty("clauseReference")
    private String clauseReference;
    @JsonProperty("description")
    private String description;

    @JsonProperty("status")
    private ApprovalStatus status;

    @JsonProperty("createdAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime createdAt;

    @JsonProperty("updatedAt")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime updatedAt;

    @JsonProperty("isEditable")
    private Boolean isEditable;

    @JsonProperty("canBeApproved")
    private Boolean canBeApproved;

    @JsonProperty("createdBy")
    private Long createdBy;

    @JsonProperty("rejectionReason")
    private String rejectionReason;

    // Default constructor
    public TimesheetResponse() {
    }

    // Full constructor
    public TimesheetResponse(Long id, Long tutorId, String tutorName, Long courseId, String courseName,
                           LocalDate weekStartDate, BigDecimal hours, BigDecimal hourlyRate, String description,
                           ApprovalStatus status, LocalDateTime createdAt, LocalDateTime updatedAt, Long createdBy,
                           String rejectionReason) {
        this.id = id;
        this.tutorId = tutorId;
        this.tutorName = tutorName;
        this.courseId = courseId;
        this.courseName = courseName;
        this.weekStartDate = weekStartDate;
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.rejectionReason = rejectionReason;

        this.taskType = TimesheetTaskType.OTHER;
        this.repeat = Boolean.FALSE;
        this.qualification = TutorQualification.STANDARD;
        this.deliveryHours = null;
        this.associatedHours = null;
        this.rateCode = null;
        this.calculationFormula = null;
        this.clauseReference = null;
        
        // Calculate computed fields
        this.totalPay = calculateTotalPay();
        this.isEditable = calculateIsEditable();
        this.canBeApproved = calculateCanBeApproved();
    }

    // Getters and Setters

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

    public String getTutorName() {
        return tutorName;
    }

    public void setTutorName(String tutorName) {
        this.tutorName = tutorName;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
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

    public BigDecimal getDeliveryHours() {
        return deliveryHours;
    }

    public void setDeliveryHours(BigDecimal deliveryHours) {
        this.deliveryHours = deliveryHours;
    }

    public BigDecimal getAssociatedHours() {
        return associatedHours;
    }

    public void setAssociatedHours(BigDecimal associatedHours) {
        this.associatedHours = associatedHours;
    }

    public BigDecimal getTotalPay() {
        return totalPay;
    }

    public void setTotalPay(BigDecimal totalPay) {
        this.totalPay = totalPay != null ? totalPay.setScale(2, RoundingMode.HALF_UP) : null;
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

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public TimesheetTaskType getTaskType() {
        return taskType;
    }

    public void setTaskType(TimesheetTaskType taskType) {
        this.taskType = taskType;
    }

    public Boolean getRepeat() {
        return repeat;
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

    public String getRateCode() {
        return rateCode;
    }

    public void setRateCode(String rateCode) {
        this.rateCode = rateCode;
    }

    public String getCalculationFormula() {
        return calculationFormula;
    }

    public void setCalculationFormula(String calculationFormula) {
        this.calculationFormula = calculationFormula;
    }

    public String getClauseReference() {
        return clauseReference;
    }

    public void setClauseReference(String clauseReference) {
        this.clauseReference = clauseReference;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    // Business logic methods
    private BigDecimal calculateTotalPay() {
        if (totalPay != null) {
            return totalPay;
        }
        if (hours == null || hourlyRate == null) {
            return BigDecimal.ZERO;
        }
        return hours.multiply(hourlyRate).setScale(2, RoundingMode.HALF_UP);
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
                ", tutorName='" + tutorName + '\'' +
                ", courseId=" + courseId +
                ", courseName='" + courseName + '\'' +
                ", weekStartDate=" + weekStartDate +
                ", hours=" + hours +
                ", hourlyRate=" + hourlyRate +
                ", deliveryHours=" + deliveryHours +
                ", associatedHours=" + associatedHours +
                ", totalPay=" + totalPay +
                ", description='" + description + '\'' +
                ", status=" + status +
                ", taskType=" + taskType +
                ", repeat=" + repeat +
                ", qualification=" + qualification +
                ", rateCode='" + rateCode + '\'' +
                ", calculationFormula='" + calculationFormula + '\'' +
                ", clauseReference='" + clauseReference + '\'' +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                ", isEditable=" + isEditable +
                ", canBeApproved=" + canBeApproved +
                ", createdBy=" + createdBy +
                ", rejectionReason='" + rejectionReason + '\'' +
                '}';
    }
}
