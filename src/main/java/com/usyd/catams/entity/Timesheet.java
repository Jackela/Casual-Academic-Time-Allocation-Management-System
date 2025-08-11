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

import com.usyd.catams.common.validation.TimesheetValidationProperties;

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
    @Digits(integer = 2, fraction = 1)
    @com.usyd.catams.common.validation.annotations.ValidHours
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal hours;
    
    @NotNull
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "amount", column = @Column(name = "hourly_rate", precision = 5, scale = 2)),
        @AttributeOverride(name = "currencyCode", column = @Column(name = "hourly_rate_currency"))
    })
    @com.usyd.catams.common.validation.annotations.ValidHourlyRate
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
     * Approval history for this timesheet - managed as part of the aggregate.
     * DbC: when modifying the approvals list, aggregate invariants must hold.
     */
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "timesheet_id", referencedColumnName = "id", insertable = false, updatable = false)
    @OrderBy("timestamp ASC")
    private List<Approval> approvals = new ArrayList<>();
    
    // Default constructor
    public Timesheet() {}

    // Injected validation properties (setter injection via @PrePersist context not available on entities)
    private static TimesheetValidationProperties validationProperties;
    public static void setValidationProperties(TimesheetValidationProperties props) { validationProperties = props; }
    
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
        enforceDynamicValidation();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        enforceDynamicValidation();
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
        // Use unsafe factory to allow setter staging; validation enforced in validateBusinessRules()
        this.weekPeriod = WeekPeriod.unsafe(weekStartDate);
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
     * Get hourly rate as BigDecimal (for backward compatibility).
     * DbC: returns null only if Money is null.
     */
    public BigDecimal getHourlyRate() {
        if (hourlyRate == null) {
            return null;
        }
        return hourlyRate.getAmount();
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
        return status.isEditable();
    }
    
    public boolean canBeApproved() {
        // Only states that accept user approval actions per SSOT
        return status == ApprovalStatus.PENDING_TUTOR_REVIEW ||
               status == ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR;
    }
    
    public void validateBusinessRules() {
        // DbC: validate week start day
        if (weekPeriod != null && weekPeriod.getStartDate() != null && weekPeriod.getStartDate().getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Week start date must be a Monday");
        }
        // SSOT: enforce hours and hourly rate ranges using validation service (via static holder in non-managed context)
        com.usyd.catams.common.validation.TimesheetValidationService svc =
                com.usyd.catams.common.validation.ValidationSSOT.get() != null
                        ? new com.usyd.catams.common.validation.TimesheetValidationService() {
                            private final com.usyd.catams.common.validation.TimesheetValidationProperties p = com.usyd.catams.common.validation.ValidationSSOT.get();
                            @Override public java.math.BigDecimal getMaxHours(){ return p.getHours().getMax(); }
                            @Override public java.math.BigDecimal getMinHours(){ return p.getMinHours(); }
                            @Override public java.math.BigDecimal getMinHourlyRate(){ return p.getMinHourlyRate(); }
                            @Override public java.math.BigDecimal getMaxHourlyRate(){ return p.getMaxHourlyRate(); }
                            @Override public String getHoursValidationMessage(){ return String.format("Hours must be between %s and %s", p.getMinHours(), p.getHours().getMax()); }
                        }
                        : null;
        BigDecimal minHours = svc != null ? svc.getMinHours() : new BigDecimal("0.1");
        BigDecimal maxHours = svc != null ? svc.getMaxHours() : new BigDecimal("38.0");
        BigDecimal minHourlyRate = svc != null ? svc.getMinHourlyRate() : new BigDecimal("10.00");
        BigDecimal maxHourlyRate = svc != null ? svc.getMaxHourlyRate() : new BigDecimal("200.00");
        if (hours != null) {
            if (hours.compareTo(minHours) < 0 || hours.compareTo(maxHours) > 0) {
                String msg = svc != null ? svc.getHoursValidationMessage() : String.format("Hours must be between %s and %s", minHours, maxHours);
                throw new IllegalArgumentException(msg);
            }
        }
        if (hourlyRate != null && hourlyRate.getAmount() != null) {
            BigDecimal rate = hourlyRate.getAmount();
            if (rate.compareTo(minHourlyRate) < 0 || rate.compareTo(maxHourlyRate) > 0) {
                throw new IllegalArgumentException(String.format(
                        "Hourly rate must be between %s and %s", minHourlyRate, maxHourlyRate));
            }
        }
    }

    /**
     * Enforce dynamic validation based on TimesheetValidationProperties.
     * Ensures hours and hourly rate are within configured bounds.
     * DbC: throws IllegalArgumentException if invariants are violated.
     */
    private void enforceDynamicValidation() {
        if (validationProperties == null) {
            return; // Property binding not available in entity context; validated elsewhere
        }
        if (hours != null) {
            BigDecimal min = validationProperties.getMinHours();
            BigDecimal max = validationProperties.getHours().getMax();
            if (min != null && hours.compareTo(min) < 0) {
                throw new IllegalArgumentException("Hours below minimum: " + min);
            }
            if (max != null && hours.compareTo(max) > 0) {
                throw new IllegalArgumentException("Hours above maximum: " + max);
            }
        }
        if (hourlyRate != null && hourlyRate.getAmount() != null) {
            BigDecimal rate = hourlyRate.getAmount();
            BigDecimal minRate = validationProperties.getMinHourlyRate();
            BigDecimal maxRate = validationProperties.getMaxHourlyRate();
            if (minRate != null && rate.compareTo(minRate) < 0) {
                throw new IllegalArgumentException("Hourly rate below minimum: " + minRate);
            }
            if (maxRate != null && rate.compareTo(maxRate) > 0) {
                throw new IllegalArgumentException("Hourly rate above maximum: " + maxRate);
            }
        }
    }
    
    // Aggregate Root methods for managing Approvals
    
    /**
     * Get all approvals for this timesheet (read-only view).
     * DbC: returned list is unmodifiable.
     */
    public List<Approval> getApprovals() {
        return Collections.unmodifiableList(approvals);
    }
    
    /**
     * Add a new approval action to this timesheet.
     * DbC: transition must be valid and results in consistent aggregate state.
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
        
        return approval;
    }
    
    /**
     * Submit timesheet for approval.
     */
    public Approval submitForApproval(Long submitterId) {
        if (!isEditable()) {
            throw new IllegalStateException("Cannot submit timesheet that is not in editable state");
        }
        
        ApprovalStatus newStatus = ApprovalAction.SUBMIT_FOR_APPROVAL.getTargetStatus(this.status);
        return addApproval(submitterId, ApprovalAction.SUBMIT_FOR_APPROVAL, this.status, newStatus, null);
    }

    /**
     * Submit timesheet for approval with comment.
     */
    public Approval submitForApproval(Long submitterId, String comment) {
        if (!isEditable()) {
            throw new IllegalStateException("Cannot submit timesheet that is not in editable state");
        }

        ApprovalStatus newStatus = ApprovalAction.SUBMIT_FOR_APPROVAL.getTargetStatus(this.status);
        return addApproval(submitterId, ApprovalAction.SUBMIT_FOR_APPROVAL, this.status, newStatus, comment);
    }
    
    /**
     * Approve timesheet.
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
     * Lecturer final approval after tutor approval.
     */
    public Approval finalApprove(Long approverId, String comment) {
        if (this.status != ApprovalStatus.APPROVED_BY_TUTOR) {
            throw new IllegalStateException("Final approval is only allowed from APPROVED_BY_TUTOR state");
        }
        
        ApprovalStatus previousStatus = this.status;
        ApprovalStatus newStatus = ApprovalAction.FINAL_APPROVAL.getTargetStatus(previousStatus);
        return addApproval(approverId, ApprovalAction.FINAL_APPROVAL, previousStatus, newStatus, comment);
    }
    
    /**
     * Reject timesheet.
     */
    public Approval reject(Long approverId, String comment) {
        // Rejection is allowed in pending stages per workflow rules
        if (this.status != ApprovalStatus.PENDING_TUTOR_REVIEW &&
            this.status != ApprovalStatus.APPROVED_BY_TUTOR &&
            this.status != ApprovalStatus.APPROVED_BY_LECTURER_AND_TUTOR) {
            throw new IllegalStateException("Timesheet cannot be rejected in current state: " + this.status);
        }
        
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection comment is required");
        }
        
        ApprovalStatus newStatus = ApprovalAction.REJECT.getTargetStatus(this.status);
        return addApproval(approverId, ApprovalAction.REJECT, this.status, newStatus, comment);
    }
    
    /**
     * Request modification to timesheet.
     */
    public Approval requestModification(Long approverId, String comment) {  
        if (!canBeApproved()) {
            throw new IllegalStateException("Cannot request modification for timesheet in current state: " + this.status);
        }
        
        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Modification request comment is required");
        }
        
        ApprovalStatus newStatus = ApprovalAction.REQUEST_MODIFICATION.getTargetStatus(this.status);
        return addApproval(approverId, ApprovalAction.REQUEST_MODIFICATION, this.status, newStatus, comment);
    }
    
    /**
     * Get the most recent approval action.
     */
    public Optional<Approval> getMostRecentApproval() {
        return approvals.stream()
                .reduce((first, second) -> second); // Get the last one due to ordering
    }
    
    /**
     * Get approval history (copy).
     */
    public List<Approval> getApprovalHistory() {
        return approvals.stream()
                .collect(Collectors.toList());
    }
    
    /**
     * Check if timesheet has any approval of a specific action type.
     */
    public boolean hasApprovalAction(ApprovalAction action) {
        return approvals.stream()
                .anyMatch(approval -> approval.getAction() == action);
    }
    
    /**
     * Get approvals of a specific action type.
     */
    public List<Approval> getApprovalsByAction(ApprovalAction action) {
        return approvals.stream()
                .filter(approval -> approval.getAction() == action)
                .collect(Collectors.toList());
    }
    
    /**
     * Clear all approvals (testing or special scenarios).
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