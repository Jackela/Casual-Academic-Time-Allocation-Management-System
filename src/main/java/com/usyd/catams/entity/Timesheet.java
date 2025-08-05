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

@Entity
@Table(name = "timesheets", 
    indexes = {
        @Index(name = "idx_timesheet_tutor", columnList = "tutorId"),
        @Index(name = "idx_timesheet_course", columnList = "courseId"),
        @Index(name = "idx_timesheet_week_start", columnList = "weekStartDate"),
        @Index(name = "idx_timesheet_status", columnList = "status"),
        @Index(name = "idx_timesheet_created_by", columnList = "createdBy")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_timesheet_tutor_course_week", 
                         columnNames = {"tutorId", "courseId", "weekStartDate"})
    }
)
public class Timesheet {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Column(nullable = false, name = "tutor_id")
    private Long tutorId;
    
    @NotNull
    @Column(nullable = false, name = "course_id")
    private Long courseId;
    
    @NotNull
    @Embedded
    @AttributeOverride(name = "weekStartDate", column = @Column(name = "week_start_date"))
    private WeekPeriod weekPeriod;
    
    @NotNull
    @DecimalMin(value = "0.1", inclusive = true)
    @DecimalMax(value = "40.0", inclusive = true)
    @Digits(integer = 2, fraction = 1)
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal hours;
    
    @NotNull
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "amount", column = @Column(name = "hourly_rate", precision = 5, scale = 2)),
        @AttributeOverride(name = "currencyCode", column = @Column(name = "hourly_rate_currency"))
    })
    private Money hourlyRate;
    
    @NotBlank
    @Size(max = 1000)
    @Column(nullable = false, length = 1000)
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ApprovalStatus status;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @NotNull
    @Column(nullable = false, name = "created_by")
    private Long createdBy;
    
    /**
     * Approval history for this timesheet - managed as part of the aggregate
     */
    @OneToMany(mappedBy = "timesheetId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("timestamp ASC")
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
        
        // WeekPeriod automatically ensures start date is Monday, so no validation needed
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        
        // WeekPeriod automatically ensures start date is Monday, so no validation needed
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
        return hourlyRate != null ? hourlyRate.getAmount() : null;
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
        return status == ApprovalStatus.DRAFT || status == ApprovalStatus.MODIFICATION_REQUESTED;
    }
    
    public boolean canBeApproved() {
        return status == ApprovalStatus.PENDING_TUTOR_REVIEW || 
               status == ApprovalStatus.PENDING_HR_REVIEW;
    }
    
    public void validateBusinessRules() {
        // WeekPeriod automatically ensures start date is Monday
        
        if (hours != null && (hours.compareTo(BigDecimal.valueOf(0.1)) < 0 || 
                             hours.compareTo(BigDecimal.valueOf(40.0)) > 0)) {
            throw new IllegalArgumentException("Hours must be between 0.1 and 40.0");
        }
        
        if (hourlyRate != null) {
            BigDecimal rate = hourlyRate.getAmount();
            if (rate.compareTo(BigDecimal.valueOf(10.00)) < 0 || 
                rate.compareTo(BigDecimal.valueOf(200.00)) > 0) {
                throw new IllegalArgumentException("Hourly rate must be between 10.00 and 200.00");
            }
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
        
        return approval;
    }
    
    /**
     * Submit timesheet for approval
     * 
     * @param submitterId ID of the user submitting
     * @return the created approval record
     */
    public Approval submitForApproval(Long submitterId) {
        if (!isEditable()) {
            throw new IllegalStateException("Cannot submit timesheet that is not in editable state");
        }
        
        return addApproval(submitterId, ApprovalAction.SUBMIT_FOR_APPROVAL, 
                          this.status, ApprovalStatus.PENDING_TUTOR_REVIEW, null);
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
        
        ApprovalStatus newStatus = (this.status == ApprovalStatus.PENDING_TUTOR_REVIEW) 
            ? ApprovalStatus.PENDING_HR_REVIEW 
            : ApprovalStatus.APPROVED;
            
        return addApproval(approverId, ApprovalAction.APPROVE, this.status, newStatus, comment);
    }
    
    /**
     * Reject timesheet
     * 
     * @param approverId ID of the approver
     * @param comment rejection comment (required)
     * @return the created approval record
     */
    public Approval reject(Long approverId, String comment) {
        if (!canBeApproved()) {
            throw new IllegalStateException("Timesheet cannot be rejected in current state: " + this.status);
        }
        
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection comment is required");
        }
        
        return addApproval(approverId, ApprovalAction.REJECT, this.status, ApprovalStatus.REJECTED, comment);
    }
    
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
        
        return addApproval(approverId, ApprovalAction.REQUEST_MODIFICATION, 
                          this.status, ApprovalStatus.MODIFICATION_REQUESTED, comment);
    }
    
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