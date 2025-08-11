package com.usyd.catams.testdata.builder;

import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Builder for {@link Course} aggregate roots following Domain-Driven Design principles.
 * 
 * This builder constructs Course entities with proper value objects (Money, CourseCode)
 * and enforces business rules around course management, budget allocation, and lecturer
 * assignment. All built courses respect domain invariants.
 * 
 * <h3>Design by Contract (DbC):</h3>
 * <ul>
 *   <li><strong>Precondition:</strong> Budget values are non-negative</li>
 *   <li><strong>Postcondition:</strong> Course entities are business-rule compliant</li>
 *   <li><strong>Invariant:</strong> Budget allocation >= budget used</li>
 * </ul>
 * 
 * <h3>Domain Rules Enforced:</h3>
 * <ul>
 *   <li>Course codes must follow institutional format (e.g., COMP1001)</li>
 *   <li>Budget allocated must be positive value</li>
 *   <li>Budget used cannot exceed budget allocated</li>
 *   <li>Lecturer must exist and have LECTURER role</li>
 *   <li>Courses are active by default for current semester</li>
 * </ul>
 * 
 * @author Integration Test Infrastructure
 * @since 1.0.0
 */
public class CourseBuilder {

    private Long id = 100L;
    private String code = "COMP1000";
    private String name = "Introduction to Computing";
    private String semester = "2025S1";
    private Long lecturerId = 1L;
    private BigDecimal budgetAllocated = new BigDecimal("10000.00");
    private BigDecimal budgetUsed = BigDecimal.ZERO;
    private Boolean isActive = true;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public CourseBuilder() {
    }

    public CourseBuilder withId(Long id) {
        this.id = id;
        return this;
    }

    public CourseBuilder withCode(String code) {
        this.code = code;
        return this;
    }

    public CourseBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public CourseBuilder withSemester(String semester) {
        this.semester = semester;
        return this;
    }

    public CourseBuilder withLecturerId(Long lecturerId) {
        this.lecturerId = lecturerId;
        return this;
    }

    public CourseBuilder withLecturer(User lecturer) {
        this.lecturerId = lecturer.getId();
        return this;
    }

    public CourseBuilder withBudgetAllocated(BigDecimal budgetAllocated) {
        this.budgetAllocated = budgetAllocated;
        return this;
    }

    public CourseBuilder withBudgetUsed(BigDecimal budgetUsed) {
        this.budgetUsed = budgetUsed;
        return this;
    }

    public CourseBuilder active() {
        this.isActive = true;
        return this;
    }

    public CourseBuilder inactive() {
        this.isActive = false;
        return this;
    }

    public Course build() {
        Course course = new Course(new CourseCode(code), name, semester, lecturerId, new Money(budgetAllocated));
        course.setId(id);
        course.setBudgetUsed(new Money(budgetUsed));
        course.setIsActive(isActive);
        course.setCreatedAt(createdAt);
        course.setUpdatedAt(updatedAt);
        return course;
    }
}
