package com.usyd.catams.application.timesheet.dto;

import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Timesheet Data Transfer Object
 * 
 * This DTO represents timesheet data that will be transferred across service boundaries.
 * When extracted to a microservice, this will become the JSON format for timesheet data
 * in REST API requests and responses.
 * 
 * Design Principles:
 * - Immutable data structure with comprehensive business logic
 * - Rich validation and calculation methods
 * - Future-ready for JSON serialization
 * - Contains calculated fields for UI display
 * - Includes approval workflow information
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public class TimesheetDto {
    
    private final Long id;
    private final Long tutorId;
    private final String tutorName;
    private final String tutorEmail;
    private final Long courseId;
    private final String courseCode;
    private final String courseName;
    private final Long lecturerId;
    private final String lecturerName;
    private final LocalDate weekStartDate;
    private final LocalDate weekEndDate;
    private final BigDecimal hours;
    private final BigDecimal hourlyRate;
    private final BigDecimal totalAmount;
    private final String description;
    private final ApprovalStatus status;
    private final boolean isSubmitted;
    private final boolean isApproved;
    private final boolean isRejected;
    private final LocalDateTime submittedAt;
    private final LocalDateTime lastModifiedAt;
    private final String lastModifiedBy;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    
    // Approval workflow information
    private final Long currentApproverId;
    private final String currentApproverName;
    private final UserRole currentApproverRole;
    private final String approvalComments;
    private final LocalDateTime approvalDeadline;
    
    public TimesheetDto(Long id, Long tutorId, String tutorName, String tutorEmail,
                       Long courseId, String courseCode, String courseName, 
                       Long lecturerId, String lecturerName,
                       LocalDate weekStartDate, LocalDate weekEndDate,
                       BigDecimal hours, BigDecimal hourlyRate, BigDecimal totalAmount,
                       String description, ApprovalStatus status,
                       boolean isSubmitted, boolean isApproved, boolean isRejected,
                       LocalDateTime submittedAt, LocalDateTime lastModifiedAt, String lastModifiedBy,
                       LocalDateTime createdAt, LocalDateTime updatedAt,
                       Long currentApproverId, String currentApproverName, UserRole currentApproverRole,
                       String approvalComments, LocalDateTime approvalDeadline) {
        this.id = id;
        this.tutorId = tutorId;
        this.tutorName = tutorName;
        this.tutorEmail = tutorEmail;
        this.courseId = courseId;
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.lecturerId = lecturerId;
        this.lecturerName = lecturerName;
        this.weekStartDate = weekStartDate;
        this.weekEndDate = weekEndDate;
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.totalAmount = totalAmount;
        this.description = description;
        this.status = status;
        this.isSubmitted = isSubmitted;
        this.isApproved = isApproved;
        this.isRejected = isRejected;
        this.submittedAt = submittedAt;
        this.lastModifiedAt = lastModifiedAt;
        this.lastModifiedBy = lastModifiedBy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.currentApproverId = currentApproverId;
        this.currentApproverName = currentApproverName;
        this.currentApproverRole = currentApproverRole;
        this.approvalComments = approvalComments;
        this.approvalDeadline = approvalDeadline;
    }
    
    /**
     * Builder pattern for easy construction
     */
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long id;
        private Long tutorId;
        private String tutorName;
        private String tutorEmail;
        private Long courseId;
        private String courseCode;
        private String courseName;
        private Long lecturerId;
        private String lecturerName;
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private BigDecimal hours;
        private BigDecimal hourlyRate;
        private BigDecimal totalAmount;
        private String description;
        private ApprovalStatus status = ApprovalStatus.DRAFT;
        private boolean isSubmitted = false;
        private boolean isApproved = false;
        private boolean isRejected = false;
        private LocalDateTime submittedAt;
        private LocalDateTime lastModifiedAt;
        private String lastModifiedBy;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private Long currentApproverId;
        private String currentApproverName;
        private UserRole currentApproverRole;
        private String approvalComments;
        private LocalDateTime approvalDeadline;
        
        public Builder id(Long id) { this.id = id; return this; }
        public Builder tutorId(Long tutorId) { this.tutorId = tutorId; return this; }
        public Builder tutorName(String tutorName) { this.tutorName = tutorName; return this; }
        public Builder tutorEmail(String tutorEmail) { this.tutorEmail = tutorEmail; return this; }
        public Builder courseId(Long courseId) { this.courseId = courseId; return this; }
        public Builder courseCode(String courseCode) { this.courseCode = courseCode; return this; }
        public Builder courseName(String courseName) { this.courseName = courseName; return this; }
        public Builder lecturerId(Long lecturerId) { this.lecturerId = lecturerId; return this; }
        public Builder lecturerName(String lecturerName) { this.lecturerName = lecturerName; return this; }
        public Builder weekStartDate(LocalDate weekStartDate) { this.weekStartDate = weekStartDate; return this; }
        public Builder weekEndDate(LocalDate weekEndDate) { this.weekEndDate = weekEndDate; return this; }
        public Builder hours(BigDecimal hours) { this.hours = hours; return this; }
        public Builder hourlyRate(BigDecimal hourlyRate) { this.hourlyRate = hourlyRate; return this; }
        public Builder totalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder status(ApprovalStatus status) { this.status = status; return this; }
        public Builder isSubmitted(boolean isSubmitted) { this.isSubmitted = isSubmitted; return this; }
        public Builder isApproved(boolean isApproved) { this.isApproved = isApproved; return this; }
        public Builder isRejected(boolean isRejected) { this.isRejected = isRejected; return this; }
        public Builder submittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; return this; }
        public Builder lastModifiedAt(LocalDateTime lastModifiedAt) { this.lastModifiedAt = lastModifiedAt; return this; }
        public Builder lastModifiedBy(String lastModifiedBy) { this.lastModifiedBy = lastModifiedBy; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public Builder currentApproverId(Long currentApproverId) { this.currentApproverId = currentApproverId; return this; }
        public Builder currentApproverName(String currentApproverName) { this.currentApproverName = currentApproverName; return this; }
        public Builder currentApproverRole(UserRole currentApproverRole) { this.currentApproverRole = currentApproverRole; return this; }
        public Builder approvalComments(String approvalComments) { this.approvalComments = approvalComments; return this; }
        public Builder approvalDeadline(LocalDateTime approvalDeadline) { this.approvalDeadline = approvalDeadline; return this; }
        
        public TimesheetDto build() {
            Objects.requireNonNull(tutorId, "Tutor ID is required");
            Objects.requireNonNull(courseId, "Course ID is required");
            Objects.requireNonNull(weekStartDate, "Week start date is required");
            Objects.requireNonNull(hours, "Hours is required");
            Objects.requireNonNull(hourlyRate, "Hourly rate is required");
            
            return new TimesheetDto(id, tutorId, tutorName, tutorEmail, 
                courseId, courseCode, courseName, lecturerId, lecturerName,
                weekStartDate, weekEndDate, hours, hourlyRate, totalAmount,
                description, status, isSubmitted, isApproved, isRejected,
                submittedAt, lastModifiedAt, lastModifiedBy, createdAt, updatedAt,
                currentApproverId, currentApproverName, currentApproverRole,
                approvalComments, approvalDeadline);
        }
    }
    
    // Getters
    public Long getId() { return id; }
    public Long getTutorId() { return tutorId; }
    public String getTutorName() { return tutorName; }
    public String getTutorEmail() { return tutorEmail; }
    public Long getCourseId() { return courseId; }
    public String getCourseCode() { return courseCode; }
    public String getCourseName() { return courseName; }
    public Long getLecturerId() { return lecturerId; }
    public String getLecturerName() { return lecturerName; }
    public LocalDate getWeekStartDate() { return weekStartDate; }
    public LocalDate getWeekEndDate() { return weekEndDate; }
    public BigDecimal getHours() { return hours; }
    public BigDecimal getHourlyRate() { return hourlyRate; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getDescription() { return description; }
    public ApprovalStatus getStatus() { return status; }
    public boolean isSubmitted() { return isSubmitted; }
    public boolean isApproved() { return isApproved; }
    public boolean isRejected() { return isRejected; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public LocalDateTime getLastModifiedAt() { return lastModifiedAt; }
    public String getLastModifiedBy() { return lastModifiedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Long getCurrentApproverId() { return currentApproverId; }
    public String getCurrentApproverName() { return currentApproverName; }
    public UserRole getCurrentApproverRole() { return currentApproverRole; }
    public String getApprovalComments() { return approvalComments; }
    public LocalDateTime getApprovalDeadline() { return approvalDeadline; }
    
    /**
     * Get full course display name (code + name)
     */
    public String getFullCourseName() {
        return String.format("%s - %s", courseCode, courseName);
    }
    
    /**
     * Get week period display string
     */
    public String getWeekPeriodDisplay() {
        if (weekEndDate != null) {
            return String.format("%s to %s", weekStartDate, weekEndDate);
        }
        return weekStartDate.toString() + " (week starting)";
    }
    
    /**
     * Calculate total amount if not provided
     */
    public BigDecimal getCalculatedTotalAmount() {
        if (totalAmount != null) {
            return totalAmount;
        }
        if (hours != null && hourlyRate != null) {
            return hours.multiply(hourlyRate);
        }
        return BigDecimal.ZERO;
    }
    
    /**
     * Check if timesheet is editable (draft or modification requested)
     */
    public boolean isEditable() {
        return status == ApprovalStatus.DRAFT || 
               status == ApprovalStatus.MODIFICATION_REQUESTED;
    }
    
    /**
     * Check if timesheet can be submitted for approval
     */
    public boolean canBeSubmitted() {
        return status == ApprovalStatus.DRAFT && 
               hours != null && hours.compareTo(BigDecimal.ZERO) > 0 &&
               hourlyRate != null && hourlyRate.compareTo(BigDecimal.ZERO) > 0;
    }
    
    /**
     * Check if timesheet is in approval workflow
     */
    public boolean isInConfirmationWorkflow() {
        return status == ApprovalStatus.PENDING_TUTOR_CONFIRMATION ||
               status == ApprovalStatus.TUTOR_CONFIRMED ||
               status == ApprovalStatus.LECTURER_CONFIRMED;
    }
    
    /**
     * Check if timesheet is finalized (cannot be changed)
     */
    public boolean isFinalized() {
        return status == ApprovalStatus.FINAL_CONFIRMED ||
               status == ApprovalStatus.REJECTED;
    }
    
    /**
     * Check if approval is overdue
     */
    public boolean isApprovalOverdue() {
        return approvalDeadline != null && 
               LocalDateTime.now().isAfter(approvalDeadline) &&
               isInConfirmationWorkflow();
    }
    
    /**
     * Get status display string for UI
     */
    public String getStatusDisplay() {
        if (status == null) {
            return "Unknown";
        }
        
        return switch (status) {
            case DRAFT -> "Draft";
            case PENDING_TUTOR_CONFIRMATION -> "Pending Tutor Confirmation";
            case TUTOR_CONFIRMED -> "Confirmed by Tutor";
            case LECTURER_CONFIRMED -> "Confirmed by Lecturer";
            case FINAL_CONFIRMED -> "Final Confirmed";
            case REJECTED -> "Rejected";
            case MODIFICATION_REQUESTED -> "Modification Requested";
        };
    }
    
    /**
     * Get next approver information
     */
    public String getNextApproverInfo() {
        if (currentApproverName != null && currentApproverRole != null) {
            return String.format("%s (%s)", currentApproverName, currentApproverRole.getDisplayName());
        } else if (currentApproverRole != null) {
            return currentApproverRole.getDisplayName();
        }
        return "Unknown";
    }
    
    /**
     * Check if timesheet has comments
     */
    public boolean hasApprovalComments() {
        return approvalComments != null && !approvalComments.trim().isEmpty();
    }
    
    /**
     * Get days until approval deadline
     */
    public long getDaysUntilDeadline() {
        if (approvalDeadline == null) {
            return -1;
        }
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDateTime.now(), approvalDeadline);
    }
    
    /**
     * Check if timesheet is recent (created within last 7 days)
     */
    public boolean isRecent() {
        if (createdAt == null) {
            return false;
        }
        return createdAt.isAfter(LocalDateTime.now().minusDays(7));
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TimesheetDto that = (TimesheetDto) o;
        return Objects.equals(id, that.id) && 
               Objects.equals(tutorId, that.tutorId) &&
               Objects.equals(courseId, that.courseId) &&
               Objects.equals(weekStartDate, that.weekStartDate);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, tutorId, courseId, weekStartDate);
    }
    
    @Override
    public String toString() {
        return String.format("TimesheetDto{id=%d, tutor='%s', course='%s', week='%s', hours=%s, status=%s}", 
            id, tutorName, getFullCourseName(), weekStartDate, hours, status);
    }
}