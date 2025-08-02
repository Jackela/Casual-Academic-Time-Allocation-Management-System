package com.usyd.catams.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses", indexes = {
    @Index(name = "idx_course_code", columnList = "code"),
    @Index(name = "idx_course_lecturer", columnList = "lecturerId"),
    @Index(name = "idx_course_semester", columnList = "semester")
})
public class Course {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Size(max = 20)
    @Column(nullable = false, unique = true, length = 20)
    private String code;
    
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
    
    @NotNull
    @DecimalMin(value = "0.00", inclusive = true)
    @Digits(integer = 10, fraction = 2)
    @Column(nullable = false, precision = 12, scale = 2, name = "budget_allocated")
    private BigDecimal budgetAllocated;
    
    @NotNull
    @DecimalMin(value = "0.00", inclusive = true)
    @Digits(integer = 10, fraction = 2)
    @Column(nullable = false, precision = 12, scale = 2, name = "budget_used")
    private BigDecimal budgetUsed = BigDecimal.ZERO;
    
    @NotNull
    @Column(nullable = false, name = "is_active")
    private Boolean isActive = true;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Default constructor
    public Course() {
    }
    
    // Constructor for creation
    public Course(String code, String name, String semester, Long lecturerId, BigDecimal budgetAllocated) {
        this.code = code;
        this.name = name;
        this.semester = semester;
        this.lecturerId = lecturerId;
        this.budgetAllocated = budgetAllocated;
        this.budgetUsed = BigDecimal.ZERO;
        this.isActive = true;
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
    
    public String getCode() {
        return code;
    }
    
    public void setCode(String code) {
        this.code = code;
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
    
    public BigDecimal getBudgetAllocated() {
        return budgetAllocated;
    }
    
    public void setBudgetAllocated(BigDecimal budgetAllocated) {
        this.budgetAllocated = budgetAllocated;
    }
    
    public BigDecimal getBudgetUsed() {
        return budgetUsed;
    }
    
    public void setBudgetUsed(BigDecimal budgetUsed) {
        this.budgetUsed = budgetUsed;
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
    public BigDecimal getBudgetRemaining() {
        return budgetAllocated.subtract(budgetUsed);
    }
    
    public boolean hasSufficientBudget(BigDecimal amount) {
        return getBudgetRemaining().compareTo(amount) >= 0;
    }
    
    public void addToBudgetUsed(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        this.budgetUsed = this.budgetUsed.add(amount);
    }
    
    public void subtractFromBudgetUsed(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        BigDecimal newBudgetUsed = this.budgetUsed.subtract(amount);
        if (newBudgetUsed.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Cannot reduce budget used below zero");
        }
        this.budgetUsed = newBudgetUsed;
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