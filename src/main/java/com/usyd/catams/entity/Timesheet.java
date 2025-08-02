package com.usyd.catams.entity;

import com.usyd.catams.enums.ApprovalStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
    @Column(nullable = false, name = "week_start_date")
    private LocalDate weekStartDate;
    
    @NotNull
    @DecimalMin(value = "0.1", inclusive = true)
    @DecimalMax(value = "40.0", inclusive = true)
    @Digits(integer = 2, fraction = 1)
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal hours;
    
    @NotNull
    @DecimalMin(value = "10.00", inclusive = true)
    @DecimalMax(value = "200.00", inclusive = true)
    @Digits(integer = 3, fraction = 2)
    @Column(nullable = false, precision = 5, scale = 2, name = "hourly_rate")
    private BigDecimal hourlyRate;
    
    @NotBlank
    @Size(max = 1000)
    @Column(nullable = false, length = 1000)
    private String description;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ApprovalStatus status = ApprovalStatus.DRAFT;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @NotNull
    @Column(nullable = false, name = "created_by")
    private Long createdBy;
    
    // Default constructor
    public Timesheet() {
    }
    
    // Constructor for creation
    public Timesheet(Long tutorId, Long courseId, LocalDate weekStartDate, 
                    BigDecimal hours, BigDecimal hourlyRate, String description, Long createdBy) {
        this.tutorId = tutorId;
        this.courseId = courseId;
        this.weekStartDate = weekStartDate;
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.description = description;
        this.createdBy = createdBy;
        this.status = ApprovalStatus.DRAFT;
    }
    
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        
        // Validate weekStartDate is Monday
        if (weekStartDate != null && weekStartDate.getDayOfWeek().getValue() != 1) {
            throw new IllegalArgumentException("Week start date must be a Monday");
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        
        // Validate weekStartDate is Monday on update too
        if (weekStartDate != null && weekStartDate.getDayOfWeek().getValue() != 1) {
            throw new IllegalArgumentException("Week start date must be a Monday");
        }
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
    public BigDecimal calculateTotalPay() {
        return hours.multiply(hourlyRate);
    }
    
    public boolean isEditable() {
        return status == ApprovalStatus.DRAFT || status == ApprovalStatus.MODIFICATION_REQUESTED;
    }
    
    public boolean canBeApproved() {
        return status == ApprovalStatus.PENDING_TUTOR_REVIEW || 
               status == ApprovalStatus.PENDING_HR_REVIEW;
    }
    
    public void validateBusinessRules() {
        if (weekStartDate != null && weekStartDate.getDayOfWeek().getValue() != 1) {
            throw new IllegalArgumentException("Week start date must be a Monday");
        }
        
        if (hours != null && (hours.compareTo(BigDecimal.valueOf(0.1)) < 0 || 
                             hours.compareTo(BigDecimal.valueOf(40.0)) > 0)) {
            throw new IllegalArgumentException("Hours must be between 0.1 and 40.0");
        }
        
        if (hourlyRate != null && (hourlyRate.compareTo(BigDecimal.valueOf(10.00)) < 0 || 
                                  hourlyRate.compareTo(BigDecimal.valueOf(200.00)) > 0)) {
            throw new IllegalArgumentException("Hourly rate must be between 10.00 and 200.00");
        }
    }
    
    @Override
    public String toString() {
        return "Timesheet{" +
                "id=" + id +
                ", tutorId=" + tutorId +
                ", courseId=" + courseId +
                ", weekStartDate=" + weekStartDate +
                ", hours=" + hours +
                ", hourlyRate=" + hourlyRate +
                ", description='" + description + '\'' +
                ", status=" + status +
                ", createdBy=" + createdBy +
                '}';
    }
}