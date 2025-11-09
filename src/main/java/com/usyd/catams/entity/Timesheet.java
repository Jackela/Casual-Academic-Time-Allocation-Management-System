package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;
    
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
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 20)
    private TimesheetTaskType taskType = TimesheetTaskType.OTHER;

    @Column(name = "is_repeat", nullable = false)
    private boolean isRepeat = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "qualification", nullable = false, length = 20)
    private TutorQualification qualification = TutorQualification.STANDARD;

    @NotNull
    @Digits(integer = 2, fraction = 1)
    @Column(name = "delivery_hours", nullable = false, precision = 3, scale = 1)
    private BigDecimal deliveryHours = BigDecimal.ZERO;

    @NotNull
    @Digits(integer = 2, fraction = 1)
    @Column(name = "associated_hours", nullable = false, precision = 3, scale = 1)
    private BigDecimal associatedHours = BigDecimal.ZERO;

    @NotNull
    @Digits(integer = 7, fraction = 2)
    @Column(name = "calculated_amount", nullable = false, precision = 9, scale = 2)
    private BigDecimal calculatedAmount = BigDecimal.ZERO;

    @Column(name = "rate_code", length = 20)
    private String rateCode;

    @Column(name = "calculation_formula", length = 255)
    private String calculationFormula;

    @Column(name = "clause_reference", length = 64)
    private String clauseReference;
    
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
        this.sessionDate = weekPeriod != null ? weekPeriod.getStartDate() : null;
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.description = description;
        this.createdBy = createdBy;
        this.status = ApprovalStatus.DRAFT;
        this.taskType = TimesheetTaskType.OTHER;
        this.qualification = TutorQualification.STANDARD;
        this.deliveryHours = hours != null ? hours : BigDecimal.ZERO;
        this.associatedHours = BigDecimal.ZERO;
        BigDecimal effectiveRate = hourlyRate != null ? hourlyRate.getAmount() : null;
        this.calculatedAmount = (hours != null && effectiveRate != null)
                ? hours.multiply(effectiveRate).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
    
    // Convenience constructor for primitive primitives used in tests
    public Timesheet(Long tutorId, Long courseId, LocalDate weekStartDate, 
                    BigDecimal hours, BigDecimal hourlyRate, String description, Long createdBy) {
        this(tutorId, courseId, new WeekPeriod(weekStartDate), hours, new Money(hourlyRate), description, createdBy);
    }
    
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.sessionDate == null && this.weekPeriod != null) {
            this.sessionDate = this.weekPeriod.getStartDate();
        }
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
        if (weekPeriod != null && this.sessionDate == null) {
            this.sessionDate = weekPeriod.getStartDate();
        }
    }
    
    public LocalDate getWeekStartDate() {
        return weekPeriod != null ? weekPeriod.getStartDate() : null;
    }
    
    public void setWeekStartDate(LocalDate weekStartDate) {
        // Use unsafe factory to allow setter staging; validation enforced in validateBusinessRules()
        this.weekPeriod = WeekPeriod.unsafe(weekStartDate);
        if (this.sessionDate == null) {
            this.sessionDate = weekStartDate;
        }
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public void setSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate != null ? sessionDate : getWeekStartDate();
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
     * Get hourly rate as a BigDecimal helper for serialization.
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

    public TimesheetTaskType getTaskType() {
        return taskType;
    }

    public void setTaskType(TimesheetTaskType taskType) {
        this.taskType = taskType != null ? taskType : TimesheetTaskType.OTHER;
    }

    public boolean isRepeat() {
        return isRepeat;
    }

    public void setRepeat(boolean repeat) {
        this.isRepeat = repeat;
    }

    public TutorQualification getQualification() {
        return qualification;
    }

    public void setQualification(TutorQualification qualification) {
        this.qualification = qualification != null ? qualification : TutorQualification.STANDARD;
    }

    public BigDecimal getDeliveryHours() {
        return deliveryHours;
    }

    public void setDeliveryHours(BigDecimal deliveryHours) {
        this.deliveryHours = deliveryHours != null ? deliveryHours : BigDecimal.ZERO;
    }

    public BigDecimal getAssociatedHours() {
        return associatedHours;
    }

    public void setAssociatedHours(BigDecimal associatedHours) {
        this.associatedHours = associatedHours != null ? associatedHours : BigDecimal.ZERO;
    }

    public BigDecimal getCalculatedAmount() {
        return calculatedAmount;
    }

    public void setCalculatedAmount(BigDecimal calculatedAmount) {
        this.calculatedAmount = calculatedAmount != null
                ? calculatedAmount.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    public String getRateCode() {
        return rateCode;
    }

    public void setRateCode(String rateCode) {
        this.rateCode = (rateCode != null && !rateCode.isBlank()) ? rateCode : null;
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
    
    public boolean canBeConfirmed() {
        // Only states that accept user confirmation actions per new SSOT
        return status == ApprovalStatus.PENDING_TUTOR_CONFIRMATION ||
               status == ApprovalStatus.TUTOR_CONFIRMED ||
               status == ApprovalStatus.LECTURER_CONFIRMED;
    }
    
    public void validateBusinessRules() {
        // DbC: validate week start day
        if (weekPeriod != null && weekPeriod.getStartDate() != null && weekPeriod.getStartDate().getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Week start date must be a Monday");
        }
        // SSOT: enforce hours and hourly rate ranges using validation properties (via static holder in non-managed context)
        com.usyd.catams.common.validation.TimesheetValidationProperties props = 
            com.usyd.catams.common.validation.ValidationSSOT.get();
        
        com.usyd.catams.common.validation.TimesheetValidationService svc =
                props != null
                        ? new com.usyd.catams.common.validation.TimesheetValidationService(props)
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
     * Tutor confirms the timesheet accuracy.
     * Transitions from PENDING_TUTOR_CONFIRMATION to TUTOR_CONFIRMED.
     */
    public Approval confirmByTutor(Long tutorId, String comment) {
        if (this.status != ApprovalStatus.PENDING_TUTOR_CONFIRMATION) {
            throw new IllegalStateException("Tutor confirmation is only allowed from PENDING_TUTOR_CONFIRMATION state");
        }
        
        ApprovalStatus previousStatus = this.status;
        ApprovalStatus newStatus = ApprovalAction.TUTOR_CONFIRM.getTargetStatus(previousStatus);
        return addApproval(tutorId, ApprovalAction.TUTOR_CONFIRM, previousStatus, newStatus, comment);
    }
    
    /**
     * Lecturer confirms the timesheet (with optional comment/reason).
     * Transitions from TUTOR_CONFIRMED to LECTURER_CONFIRMED.
     */
    public Approval confirmByLecturer(Long lecturerId, String comment) {
        if (this.status != ApprovalStatus.TUTOR_CONFIRMED) {
            throw new IllegalStateException("Lecturer confirmation is only allowed from TUTOR_CONFIRMED state");
        }
        
        ApprovalStatus previousStatus = this.status;
        ApprovalStatus newStatus = ApprovalAction.LECTURER_CONFIRM.getTargetStatus(previousStatus);
        return addApproval(lecturerId, ApprovalAction.LECTURER_CONFIRM, previousStatus, newStatus, comment);
    }
    
    /**
     * HR/Admin gives final confirmation for payroll processing.
     * Transitions from LECTURER_CONFIRMED to FINAL_CONFIRMED.
     */
    public Approval confirmByHR(Long hrId, String comment) {
        if (this.status != ApprovalStatus.LECTURER_CONFIRMED) {
            throw new IllegalStateException("HR confirmation is only allowed from LECTURER_CONFIRMED state");
        }
        
        ApprovalStatus previousStatus = this.status;
        ApprovalStatus newStatus = ApprovalAction.HR_CONFIRM.getTargetStatus(previousStatus);
        return addApproval(hrId, ApprovalAction.HR_CONFIRM, previousStatus, newStatus, comment);
    }
    
    /**
     * Reject timesheet.
     */
    public Approval reject(Long approverId, String comment) {
        // Rejection is allowed in confirmation stages per new workflow rules
        if (this.status != ApprovalStatus.PENDING_TUTOR_CONFIRMATION &&
            this.status != ApprovalStatus.TUTOR_CONFIRMED &&
            this.status != ApprovalStatus.LECTURER_CONFIRMED) {
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
        if (!canBeConfirmed()) {
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
