package com.usyd.catams.application.course.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Course Data Transfer Object
 * 
 * This DTO represents course data that will be transferred across service boundaries.
 * When extracted to a microservice, this will become the JSON format for course data
 * in REST API requests and responses.
 * 
 * Design Principles:
 * - Immutable data structure
 * - No domain logic, pure data holder
 * - Serializable for future JSON conversion
 * - Contains only data needed across service boundaries
 * - Includes financial and capacity information for business operations
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public class CourseDto {
    
    private final Long id;
    private final String courseCode;
    private final String courseName;
    private final String description;
    private final String semester;
    private final Integer year;
    private final Long lecturerId;
    private final String lecturerName;
    private final String lecturerEmail;
    private final boolean active;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final Integer maxStudents;
    private final Integer currentEnrollment;
    private final Integer maxTutors;
    private final Integer currentTutors;
    private final BigDecimal budgetLimit;
    private final BigDecimal budgetUsed;
    private final BigDecimal defaultHourlyRate;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    
    public CourseDto(Long id, String courseCode, String courseName, String description,
                     String semester, Integer year, Long lecturerId, String lecturerName,
                     String lecturerEmail, boolean active, LocalDate startDate, LocalDate endDate,
                     Integer maxStudents, Integer currentEnrollment, Integer maxTutors,
                     Integer currentTutors, BigDecimal budgetLimit, BigDecimal budgetUsed,
                     BigDecimal defaultHourlyRate, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.description = description;
        this.semester = semester;
        this.year = year;
        this.lecturerId = lecturerId;
        this.lecturerName = lecturerName;
        this.lecturerEmail = lecturerEmail;
        this.active = active;
        this.startDate = startDate;
        this.endDate = endDate;
        this.maxStudents = maxStudents;
        this.currentEnrollment = currentEnrollment;
        this.maxTutors = maxTutors;
        this.currentTutors = currentTutors;
        this.budgetLimit = budgetLimit;
        this.budgetUsed = budgetUsed;
        this.defaultHourlyRate = defaultHourlyRate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    
    /**
     * Builder pattern for easy construction in tests and services
     */
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long id;
        private String courseCode;
        private String courseName;
        private String description;
        private String semester;
        private Integer year;
        private Long lecturerId;
        private String lecturerName;
        private String lecturerEmail;
        private boolean active = true;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer maxStudents;
        private Integer currentEnrollment = 0;
        private Integer maxTutors;
        private Integer currentTutors = 0;
        private BigDecimal budgetLimit;
        private BigDecimal budgetUsed = BigDecimal.ZERO;
        private BigDecimal defaultHourlyRate;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        
        public Builder id(Long id) { this.id = id; return this; }
        public Builder courseCode(String courseCode) { this.courseCode = courseCode; return this; }
        public Builder courseName(String courseName) { this.courseName = courseName; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder semester(String semester) { this.semester = semester; return this; }
        public Builder year(Integer year) { this.year = year; return this; }
        public Builder lecturerId(Long lecturerId) { this.lecturerId = lecturerId; return this; }
        public Builder lecturerName(String lecturerName) { this.lecturerName = lecturerName; return this; }
        public Builder lecturerEmail(String lecturerEmail) { this.lecturerEmail = lecturerEmail; return this; }
        public Builder active(boolean active) { this.active = active; return this; }
        public Builder startDate(LocalDate startDate) { this.startDate = startDate; return this; }
        public Builder endDate(LocalDate endDate) { this.endDate = endDate; return this; }
        public Builder maxStudents(Integer maxStudents) { this.maxStudents = maxStudents; return this; }
        public Builder currentEnrollment(Integer currentEnrollment) { this.currentEnrollment = currentEnrollment; return this; }
        public Builder maxTutors(Integer maxTutors) { this.maxTutors = maxTutors; return this; }
        public Builder currentTutors(Integer currentTutors) { this.currentTutors = currentTutors; return this; }
        public Builder budgetLimit(BigDecimal budgetLimit) { this.budgetLimit = budgetLimit; return this; }
        public Builder budgetUsed(BigDecimal budgetUsed) { this.budgetUsed = budgetUsed; return this; }
        public Builder defaultHourlyRate(BigDecimal defaultHourlyRate) { this.defaultHourlyRate = defaultHourlyRate; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        
        public CourseDto build() {
            Objects.requireNonNull(id, "Course ID is required");
            Objects.requireNonNull(courseCode, "Course code is required");
            Objects.requireNonNull(courseName, "Course name is required");
            Objects.requireNonNull(lecturerId, "Lecturer ID is required");
            
            return new CourseDto(id, courseCode, courseName, description, semester, year,
                lecturerId, lecturerName, lecturerEmail, active, startDate, endDate,
                maxStudents, currentEnrollment, maxTutors, currentTutors,
                budgetLimit, budgetUsed, defaultHourlyRate, createdAt, updatedAt);
        }
    }
    
    // Getters
    public Long getId() { return id; }
    public String getCourseCode() { return courseCode; }
    public String getCourseName() { return courseName; }
    public String getDescription() { return description; }
    public String getSemester() { return semester; }
    public Integer getYear() { return year; }
    public Long getLecturerId() { return lecturerId; }
    public String getLecturerName() { return lecturerName; }
    public String getLecturerEmail() { return lecturerEmail; }
    public boolean isActive() { return active; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public Integer getMaxStudents() { return maxStudents; }
    public Integer getCurrentEnrollment() { return currentEnrollment; }
    public Integer getMaxTutors() { return maxTutors; }
    public Integer getCurrentTutors() { return currentTutors; }
    public BigDecimal getBudgetLimit() { return budgetLimit; }
    public BigDecimal getBudgetUsed() { return budgetUsed; }
    public BigDecimal getDefaultHourlyRate() { return defaultHourlyRate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    
    /**
     * Get full course display name (code + name)
     */
    public String getFullCourseName() {
        return String.format("%s - %s", courseCode, courseName);
    }
    
    /**
     * Check if course is currently active and within semester dates
     */
    public boolean isCurrentlyActive() {
        if (!active) {
            return false;
        }
        
        LocalDate now = LocalDate.now();
        return (startDate == null || !now.isBefore(startDate)) &&
               (endDate == null || !now.isAfter(endDate));
    }
    
    /**
     * Check if course has available tutor slots
     */
    public boolean hasTutorSlots() {
        if (maxTutors == null) {
            return true; // No limit set
        }
        return currentTutors < maxTutors;
    }
    
    /**
     * Check if course is at student capacity
     */
    public boolean isAtStudentCapacity() {
        if (maxStudents == null) {
            return false; // No limit set
        }
        return currentEnrollment >= maxStudents;
    }
    
    /**
     * Get remaining budget amount
     */
    public BigDecimal getRemainingBudget() {
        if (budgetLimit == null) {
            return null; // No budget limit set
        }
        if (budgetUsed == null) {
            return budgetLimit;
        }
        return budgetLimit.subtract(budgetUsed);
    }
    
    /**
     * Check if course has sufficient budget for an amount
     */
    public boolean hasSufficientBudget(BigDecimal amount) {
        BigDecimal remaining = getRemainingBudget();
        return remaining == null || remaining.compareTo(amount) >= 0;
    }
    
    /**
     * Get budget utilization percentage (0-100)
     */
    public BigDecimal getBudgetUtilizationPercentage() {
        if (budgetLimit == null || budgetLimit.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        if (budgetUsed == null) {
            return BigDecimal.ZERO;
        }
        return budgetUsed
                .divide(budgetLimit, 4, java.math.RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
    }
    
    /**
     * Get course semester and year display string
     */
    public String getSemesterYear() {
        if (semester == null && year == null) {
            return "Not specified";
        }
        if (semester == null) {
            return year.toString();
        }
        if (year == null) {
            return semester;
        }
        return String.format("%s %d", semester, year);
    }
    
    /**
     * Check if this is a current semester course
     */
    public boolean isCurrentSemester() {
        if (year == null) {
            return false;
        }
        
        LocalDate now = LocalDate.now();
        int currentYear = now.getYear();
        
        // Simple logic - could be enhanced with actual semester date ranges
        return year == currentYear;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CourseDto courseDto = (CourseDto) o;
        return Objects.equals(id, courseDto.id) && 
               Objects.equals(courseCode, courseDto.courseCode);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, courseCode);
    }
    
    @Override
    public String toString() {
        return String.format("CourseDto{id=%d, courseCode='%s', courseName='%s', lecturer=%s, active=%s}", 
            id, courseCode, courseName, lecturerName, active);
    }
}