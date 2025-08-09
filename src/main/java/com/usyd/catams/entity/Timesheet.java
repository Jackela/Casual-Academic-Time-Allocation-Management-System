package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.usyd.catams.common.validation.TimesheetValidationConstants;    @OrderBy("timestamp ASC")
    private List<Approval> approvals = new ArrayList<>();
    
    // Default constructor
    public Timesheet() {
    }
    
    // Constructor for creation
    public Timesheet(Long tutorId, Long courseId, WeekPeriod weekPeriod, 
                    BigDecimal hours, Money hourlyRate, String description, Long createdBy) {
        this.tutorId = tutorId;
        this.courseId = courseId;
        this.weekPeriod = weekPeriod;
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.description = description;
        this.createdBy = createdBy;
        this.status = ApprovalStatus.DRAFT;
    }
    
    // Constructor with primitives for backwards compatibility
    public Timesheet(Long tutorId, Long courseId, LocalDate weekStartDate, 
                    BigDecimal hours, BigDecimal hourlyRate, String description, Long createdBy) {
        this(tutorId, courseId, new WeekPeriod(weekStartDate), hours, new Money(hourlyRate), description, createdBy);
    }
    
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        
        // Validate on create
        validateBusinessRules();    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        
        // Validate on update
        validateBusinessRules();    }
    
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
    
    public Long getCourseId() {
        return courseId;
    }
    
    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }
    
    public WeekPeriod getWeekPeriod() {
        return weekPeriod;
    }
    
    public void setWeekPeriod(WeekPeriod weekPeriod) {
        this.weekPeriod = weekPeriod;
    }
    
    public LocalDate getWeekStartDate() {
        return weekPeriod != null ? weekPeriod.getStartDate() : null;
    }
    
    public void setWeekStartDate(LocalDate weekStartDate) {
        this.weekPeriod = new WeekPeriod(weekStartDate);
    }
    
    public BigDecimal getHours() {
        return hours;
    }
    
    public void setHours(BigDecimal hours) {
        this.hours = hours;
    }
    
    public Money getHourlyRateMoney() {
        return hourlyRate;
    }
    
    public void setHourlyRate(Money hourlyRate) {
        this.hourlyRate = hourlyRate;
    }
    
    public void setHourlyRate(BigDecimal hourlyRate) {
        this.hourlyRate = new Money(hourlyRate);
    }
    
    /**
     * Get hourly rate as BigDecimal (for backward compatibility)
     */
    public BigDecimal getHourlyRate() {
        if (hourlyRate == null || hourlyRate.getAmount() == null) {
            return null;
        }
        BigDecimal normalized = hourlyRate.getAmount().stripTrailingZeros();
        if (normalized.scale() < 1) {
            normalized = normalized.setScale(1);
        }
        return normalized;    }
    
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
    
    public Long getCreatedBy() {
        return createdBy;
    }
    
    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }
    
    // Business methods
    public Money calculateTotalPay() {
        return hourlyRate.multiply(hours);
    }
    
    public BigDecimal calculateTotalPayAmount() {
        return calculateTotalPay().getAmount();
    }
    
    public boolean isEditable() {
        return status.isEditable();
    }
    
    public boolean canBeApproved() {
        // Only states that accept user approval actions per SSOT
        return status == ApprovalStatus.PENDING_TUTOR_REVIEW ||
               status == ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR;
    }
    
    public void validateBusinessRules() {
        // Ensure week start date is Monday
        if (weekPeriod != null && weekPeriod.getStartDate() != null && weekPeriod.getStartDate().getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Monday");
        }        
        if (hours != null && (hours.compareTo(TimesheetValidationConstants.getMinHours()) < 0 || 
                             hours.compareTo(TimesheetValidationConstants.getMaxHours()) > 0)) {
            throw new IllegalArgumentException(TimesheetValidationConstants.getHoursValidationMessage());
        }
        
        if (hourlyRate != null) {
            BigDecimal rate = hourlyRate.getAmount();
            if (rate.compareTo(TimesheetValidationConstants.getMinHourlyRate()) < 0 || 
                rate.compareTo(TimesheetValidationConstants.getMaxHourlyRate()) > 0) {
                throw new IllegalArgumentException(TimesheetValidationConstants.getHourlyRateValidationMessage());            }
        }
    }
    
    // Aggregate Root methods for managing Approvals
    
    /**
     * Get all approvals for this timesheet (read-only view)
     * 
     * @return immutable list of approvals
     */
    public List<Approval> getApprovals() {
        return Collections.unmodifiableList(approvals);
    }
    
    /**
     * Add a new approval action to this timesheet
     * 
     * @param approverId ID of the user performing the action
     * @param action the approval action being performed
     * @param previousStatus the status before the action
     * @param newStatus the status after the action  
     * @param comment optional comment explaining the action
     * @return the created approval
     */
    public Approval addApproval(Long approverId, ApprovalAction action, 
                               ApprovalStatus previousStatus, ApprovalStatus newStatus, String comment) {
        Approval approval = new Approval(this.id, approverId, action, previousStatus, newStatus, comment);
        
        // Allow validation with null timesheet ID for unpersisted entities
        approval.validateBusinessRules(this.id != null);
        
        // Update timesheet status
        this.status = newStatus;
        this.updatedAt = LocalDateTime.now();
        
        // Add to the approval list
        approvals.add(approval);
        
        // SSOT: No automatic transitions. All transitions require explicit actions.
            }
    
    /**
     * Approve timesheet
     * 
     * @param approverId ID of the approver
     * @param comment optional approval comment
     * @return the created approval record
     */
    public Approval approve(Long approverId, String comment) {
        if (!canBeApproved()) {
            throw new IllegalStateException("Timesheet cannot be approved in current state: " + this.status.name());
        }
        
        ApprovalStatus previousStatus = this.status;
        ApprovalStatus newStatus = ApprovalAction.APPROVE.getTargetStatus(previousStatus);
        return addApproval(approverId, ApprovalAction.APPROVE, previousStatus, newStatus, comment);
    }
    
    /**
     * Lecturer final approval after tutor approval
     * 
     * @param approverId ID of the lecturer approving
     * @param comment optional approval comment
     * @return the created approval record
     */
    public Approval finalApprove(Long approverId, String comment) {
        if (this.status != ApprovalStatus.APPROVED_BY_TUTOR) {
            throw new IllegalStateException("Final approval is only allowed from APPROVED_BY_TUTOR state");
        }
        
        ApprovalStatus previousStatus = this.status;
        ApprovalStatus newStatus = ApprovalAction.FINAL_APPROVAL.getTargetStatus(previousStatus);
        return addApproval(approverId, ApprovalAction.FINAL_APPROVAL, previousStatus, newStatus, comment);    }
    
    /**
     * Reject timesheet
     * 
     * @param approverId ID of the approver
     * @param comment rejection comment (required)
     * @return the created approval record
     */
    public Approval reject(Long approverId, String comment) {
        // Rejection is allowed in pending stages per workflow rules:
        // - PENDING_TUTOR_REVIEW (tutor stage)
        // - APPROVED_BY_TUTOR (lecturer final approval stage)
        // - APPROVED_BY_LECTURER_AND_TUTOR (HR stage with HR_REJECT, handled separately)
        if (this.status != ApprovalStatus.PENDING_TUTOR_REVIEW &&
            this.status != ApprovalStatus.APPROVED_BY_TUTOR &&
            this.status != ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR) {            throw new IllegalStateException("Timesheet cannot be rejected in current state: " + this.status);
        }
        
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection comment is required");
        }
        
        ApprovalStatus newStatus = ApprovalAction.REJECT.getTargetStatus(this.status);
        return addApproval(approverId, ApprovalAction.REJECT, this.status, newStatus, comment);    }
    
    /**
     * Request modification to timesheet
     * 
     * @param approverId ID of the approver
     * @param comment modification request comment (required)
     * @return the created approval record
     */
    public Approval requestModification(Long approverId, String comment) {  
        if (!canBeApproved()) {
            throw new IllegalStateException("Cannot request modification for timesheet in current state: " + this.status);
        }
        
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Modification request comment is required");
        }
        
        ApprovalStatus newStatus = ApprovalAction.REQUEST_MODIFICATION.getTargetStatus(this.status);
        return addApproval(approverId, ApprovalAction.REQUEST_MODIFICATION, this.status, newStatus, comment);    }
    
    /**
     * Get the most recent approval action
     * 
     * @return the most recent approval, if any
     */
    public Optional<Approval> getMostRecentApproval() {
        return approvals.stream()
                .reduce((first, second) -> second); // Get the last one due to ordering
    }
    
    /**
     * Get approval history with approver names (requires approver details to be fetched separately)
     * 
     * @return list of approvals ordered by timestamp
     */
    public List<Approval> getApprovalHistory() {
        return approvals.stream()
                .collect(Collectors.toList());
    }
    
    /**
     * Check if timesheet has any approval of a specific action type
     * 
     * @param action the approval action to check for
     * @return true if such approval exists
     */
    public boolean hasApprovalAction(ApprovalAction action) {
        return approvals.stream()
                .anyMatch(approval -> approval.getAction() == action);
    }
    
    /**
     * Get approvals of a specific action type
     * 
     * @param action the approval action type
     * @return list of matching approvals
     */
    public List<Approval> getApprovalsByAction(ApprovalAction action) {
        return approvals.stream()
                .filter(approval -> approval.getAction() == action)
                .collect(Collectors.toList());
    }
    
    /**
     * Clear all approvals (used for testing or special scenarios)
     */
    protected void clearApprovals() {
        approvals.clear();
    }
    
    @Override
    public String toString() {
        return "Timesheet{" +
                "id=" + id +
                ", tutorId=" + tutorId +
                ", courseId=" + courseId +
                ", weekPeriod=" + weekPeriod +
                ", hours=" + hours +
                ", hourlyRate=" + hourlyRate +
                ", description='" + description + '\'' +
                ", status=" + status +
                ", createdBy=" + createdBy +
                '}';
    }
}