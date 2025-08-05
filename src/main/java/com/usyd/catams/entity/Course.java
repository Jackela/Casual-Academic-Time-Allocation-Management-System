package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses", indexes = {
    @Index(name = "idx_course_code", columnList = "code_value"),
    @Index(name = "idx_course_lecturer", columnList = "lecturerId"),
    @Index(name = "idx_course_semester", columnList = "semester")
})
public class Course {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "code_value", nullable = false, unique = true, length = 20))
    private CourseCode code;
    
    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String name;
    
    @NotBlank
    @Size(max = 50)
    @Column(nullable = false, length = 50)
    private String semester;
    
    @NotNull
    @Column(nullable = false, name = "lecturer_id")
    private Long lecturerId;
    
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "amount", column = @Column(name = "budget_allocated", precision = 12, scale = 2)),
        @AttributeOverride(name = "currencyCode", column = @Column(name = "budget_allocated_currency"))
    })
    private Money budgetAllocated;
    
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "amount", column = @Column(name = "budget_used", precision = 12, scale = 2)),
        @AttributeOverride(name = "currencyCode", column = @Column(name = "budget_used_currency"))
    })
    private Money budgetUsed;
    
    @NotNull
    @Column(nullable = false, name = "is_active")
    private Boolean isActive;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Default constructor
    public Course() {
    }
    
    // Constructor for creation
    public Course(CourseCode code, String name, String semester, Long lecturerId, Money budgetAllocated) {
        this.code = code;
        this.name = name;
        this.semester = semester;
        this.lecturerId = lecturerId;
        this.budgetAllocated = budgetAllocated;
        this.budgetUsed = Money.zero();
        this.isActive = true;
    }
    
    // Constructor with string code for backwards compatibility
    public Course(String codeString, String name, String semester, Long lecturerId, BigDecimal budgetAllocated) {
        this(new CourseCode(codeString), name, semester, lecturerId, new Money(budgetAllocated));
    }
    
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public CourseCode getCourseCodeObject() {
        return code;
    }
    
    /**
     * Get course code as string (for backward compatibility)
     */
    public String getCode() {
        return code != null ? code.getValue() : null;
    }
    
    public void setCode(CourseCode code) {
        this.code = code;
    }
    
    public void setCode(String codeString) {
        this.code = new CourseCode(codeString);
    }
    
    public String getCodeValue() {
        return code != null ? code.getValue() : null;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getSemester() {
        return semester;
    }
    
    public void setSemester(String semester) {
        this.semester = semester;
    }
    
    public Long getLecturerId() {
        return lecturerId;
    }
    
    public void setLecturerId(Long lecturerId) {
        this.lecturerId = lecturerId;
    }
    
    public Money getBudgetAllocatedMoney() {
        return budgetAllocated;
    }
    
    public void setBudgetAllocated(Money budgetAllocated) {
        this.budgetAllocated = budgetAllocated;
    }
    
    public void setBudgetAllocated(BigDecimal budgetAllocated) {
        this.budgetAllocated = new Money(budgetAllocated);
    }
    
    public Money getBudgetUsedMoney() {
        return budgetUsed;
    }
    
    public void setBudgetUsed(Money budgetUsed) {
        this.budgetUsed = budgetUsed;
    }
    
    public void setBudgetUsed(BigDecimal budgetUsed) {
        this.budgetUsed = new Money(budgetUsed);
    }
    
    /**
     * Get budget allocated as BigDecimal (for backward compatibility)
     */
    public BigDecimal getBudgetAllocated() {
        return budgetAllocated != null ? budgetAllocated.getAmount() : null;
    }
    
    /**
     * Get budget used as BigDecimal (for backward compatibility)
     */
    public BigDecimal getBudgetUsed() {
        return budgetUsed != null ? budgetUsed.getAmount() : null;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
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
    
    // Business methods
    public Money getBudgetRemaining() {
        return budgetAllocated.subtractAllowingNegative(budgetUsed);
    }
    
    public BigDecimal getBudgetRemainingAmount() {
        return getBudgetRemaining().getAmount();
    }
    
    public boolean hasSufficientBudget(Money amount) {
        // Special case: zero amount is always allowed regardless of budget status
        if (amount.isZero()) {
            return true;
        }
        return getBudgetRemaining().isGreaterThanOrEqual(amount);
    }
    
    public boolean hasSufficientBudget(BigDecimal amount) {
        return hasSufficientBudget(new Money(amount));
    }
    
    public void addToBudgetUsed(Money amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount cannot be null");
        }
        this.budgetUsed = this.budgetUsed.add(amount);
    }
    
    public void addToBudgetUsed(BigDecimal amount) {
        addToBudgetUsed(new Money(amount));
    }
    
    public void subtractFromBudgetUsed(Money amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount cannot be null");
        }
        this.budgetUsed = this.budgetUsed.subtractAllowingNegative(amount);
    }
    
    public void subtractFromBudgetUsed(BigDecimal amount) {
        subtractFromBudgetUsed(new Money(amount));
    }
    
    @Override
    public String toString() {
        return "Course{" +
                "id=" + id +
                ", code='" + code + '\'' +
                ", name='" + name + '\'' +
                ", semester='" + semester + '\'' +
                ", lecturerId=" + lecturerId +
                ", budgetAllocated=" + budgetAllocated +
                ", budgetUsed=" + budgetUsed +
                ", isActive=" + isActive +
                '}';
    }
}