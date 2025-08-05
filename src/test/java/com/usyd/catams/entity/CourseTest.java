package com.usyd.catams.entity;

import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CourseTest {

    private Course course;
    private CourseCode courseCode;
    private String name;
    private String semester;
    private Long lecturerId;
    private Money budgetAllocated;

    @BeforeEach
    void setUp() {
        courseCode = new CourseCode("COMP3999");
        name = "Software Engineering";
        semester = "2024S1";
        lecturerId = 123L;
        budgetAllocated = new Money(new BigDecimal("5000.00"));
        
        course = new Course(courseCode, name, semester, lecturerId, budgetAllocated);
    }

    @Test
    void testDefaultConstructor() {
        // When
        Course emptyCourse = new Course();

        // Then
        assertThat(emptyCourse.getId()).isNull();
        assertThat(emptyCourse.getCode()).isNull();
        assertThat(emptyCourse.getName()).isNull();
        assertThat(emptyCourse.getSemester()).isNull();
        assertThat(emptyCourse.getLecturerId()).isNull();
        assertThat(emptyCourse.getBudgetAllocated()).isNull();
        assertThat(emptyCourse.getBudgetUsed()).isNull();
        assertThat(emptyCourse.getIsActive()).isNull();
        assertThat(emptyCourse.getCreatedAt()).isNull();
        assertThat(emptyCourse.getUpdatedAt()).isNull();
    }

    @Test
    void testConstructorWithCourseCodeAndMoney() {
        // When
        Course course = new Course(courseCode, name, semester, lecturerId, budgetAllocated);

        // Then
        assertThat(course.getCourseCodeObject()).isEqualTo(courseCode);
        assertThat(course.getCode()).isEqualTo(courseCode.getValue());
        assertThat(course.getName()).isEqualTo(name);
        assertThat(course.getSemester()).isEqualTo(semester);
        assertThat(course.getLecturerId()).isEqualTo(lecturerId);
        assertThat(course.getBudgetAllocatedMoney()).isEqualTo(budgetAllocated);
        assertThat(course.getBudgetAllocated()).isEqualByComparingTo(budgetAllocated.getAmount());
        assertThat(course.getBudgetUsedMoney()).isEqualTo(Money.zero());
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(course.getIsActive()).isTrue();
    }

    @Test
    void testConstructorWithPrimitives() {
        // Given
        String codeString = "MATH2001";
        BigDecimal budgetAmount = new BigDecimal("3000.00");

        // When
        Course course = new Course(codeString, name, semester, lecturerId, budgetAmount);

        // Then
        assertThat(course.getCode()).isEqualTo(codeString);
        assertThat(course.getCodeValue()).isEqualTo(codeString);
        assertThat(course.getBudgetAllocated()).isEqualByComparingTo(budgetAmount);
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(course.getIsActive()).isTrue();
    }

    @Test
    void testGettersAndSetters() {
        // Given
        Long id = 456L;
        CourseCode newCode = new CourseCode("MATH2001");
        String newName = "Linear Algebra";
        String newSemester = "2024S2";
        Long newLecturerId = 789L;
        Money newBudgetAllocated = new Money(new BigDecimal("4000.00"));
        Money newBudgetUsed = new Money(new BigDecimal("1500.00"));
        Boolean isActive = false;
        LocalDateTime now = LocalDateTime.now();

        // When
        course.setId(id);
        course.setCode(newCode);
        course.setName(newName);
        course.setSemester(newSemester);
        course.setLecturerId(newLecturerId);
        course.setBudgetAllocated(newBudgetAllocated);
        course.setBudgetUsed(newBudgetUsed);
        course.setIsActive(isActive);
        course.setCreatedAt(now);
        course.setUpdatedAt(now);

        // Then
        assertThat(course.getId()).isEqualTo(id);
        assertThat(course.getCourseCodeObject()).isEqualTo(newCode);
        assertThat(course.getCode()).isEqualTo(newCode.getValue());
        assertThat(course.getName()).isEqualTo(newName);
        assertThat(course.getSemester()).isEqualTo(newSemester);
        assertThat(course.getLecturerId()).isEqualTo(newLecturerId);
        assertThat(course.getBudgetAllocatedMoney()).isEqualTo(newBudgetAllocated);
        assertThat(course.getBudgetUsedMoney()).isEqualTo(newBudgetUsed);
        assertThat(course.getIsActive()).isEqualTo(isActive);
        assertThat(course.getCreatedAt()).isEqualTo(now);
        assertThat(course.getUpdatedAt()).isEqualTo(now);
    }

    @Test
    void testCourseCodeMethods() {
        // Test setting code with string
        String newCodeString = "PHYS1001";
        course.setCode(newCodeString);
        
        assertThat(course.getCode()).isEqualTo(newCodeString);
        assertThat(course.getCodeValue()).isEqualTo(newCodeString);
        assertThat(course.getCourseCodeObject().getValue()).isEqualTo(newCodeString);

        // Test setting code with CourseCode object
        CourseCode codeObject = new CourseCode("CHEM2001");
        course.setCode(codeObject);
        
        assertThat(course.getCourseCodeObject()).isEqualTo(codeObject);
        assertThat(course.getCode()).isEqualTo(codeObject.getValue());
        assertThat(course.getCodeValue()).isEqualTo(codeObject.getValue());
    }

    @Test
    void testBudgetMethods() {
        // Test setting budget with Money objects
        Money newAllocated = new Money(new BigDecimal("6000.00"));
        Money newUsed = new Money(new BigDecimal("2000.00"));
        
        course.setBudgetAllocated(newAllocated);
        course.setBudgetUsed(newUsed);
        
        assertThat(course.getBudgetAllocatedMoney()).isEqualTo(newAllocated);
        assertThat(course.getBudgetAllocated()).isEqualByComparingTo(new BigDecimal("6000.00"));
        assertThat(course.getBudgetUsedMoney()).isEqualTo(newUsed);
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("2000.00"));

        // Test setting budget with BigDecimal
        course.setBudgetAllocated(new BigDecimal("7000.00"));
        course.setBudgetUsed(new BigDecimal("2500.00"));
        
        assertThat(course.getBudgetAllocated()).isEqualByComparingTo(new BigDecimal("7000.00"));
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("2500.00"));
    }

    @Test
    void testGetBudgetRemaining() {
        // Given
        course.setBudgetAllocated(new BigDecimal("5000.00"));
        course.setBudgetUsed(new BigDecimal("1500.00"));

        // When
        Money budgetRemaining = course.getBudgetRemaining();
        BigDecimal budgetRemainingAmount = course.getBudgetRemainingAmount();

        // Then
        assertThat(budgetRemaining.getAmount()).isEqualByComparingTo(new BigDecimal("3500.00"));
        assertThat(budgetRemainingAmount).isEqualByComparingTo(new BigDecimal("3500.00"));
    }

    @Test
    void testHasSufficientBudget() {
        // Given
        course.setBudgetAllocated(new BigDecimal("5000.00"));
        course.setBudgetUsed(new BigDecimal("2000.00"));
        // Remaining budget is 3000.00

        // When & Then
        // Test with Money object
        assertThat(course.hasSufficientBudget(new Money(new BigDecimal("1000.00")))).isTrue();
        assertThat(course.hasSufficientBudget(new Money(new BigDecimal("3000.00")))).isTrue();
        assertThat(course.hasSufficientBudget(new Money(new BigDecimal("4000.00")))).isFalse();

        // Test with BigDecimal
        assertThat(course.hasSufficientBudget(new BigDecimal("1000.00"))).isTrue();
        assertThat(course.hasSufficientBudget(new BigDecimal("3000.00"))).isTrue();
        assertThat(course.hasSufficientBudget(new BigDecimal("4000.00"))).isFalse();
    }

    @Test
    void testAddToBudgetUsed() {
        // Given
        course.setBudgetUsed(new BigDecimal("1000.00"));

        // When - Add with Money object
        course.addToBudgetUsed(new Money(new BigDecimal("500.00")));

        // Then
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("1500.00"));

        // When - Add with BigDecimal
        course.addToBudgetUsed(new BigDecimal("250.00"));

        // Then
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("1750.00"));
    }

    @Test
    void testAddToBudgetUsedWithNull() {
        // When & Then
        assertThatThrownBy(() -> course.addToBudgetUsed((Money) null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Amount cannot be null");
    }

    @Test
    void testSubtractFromBudgetUsed() {
        // Given
        course.setBudgetUsed(new BigDecimal("2000.00"));

        // When - Subtract with Money object
        course.subtractFromBudgetUsed(new Money(new BigDecimal("500.00")));

        // Then
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("1500.00"));

        // When - Subtract with BigDecimal
        course.subtractFromBudgetUsed(new BigDecimal("300.00"));

        // Then
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("1200.00"));
    }

    @Test
    void testSubtractFromBudgetUsedWithNull() {
        // When & Then
        assertThatThrownBy(() -> course.subtractFromBudgetUsed((Money) null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Amount cannot be null");
    }

    @Test
    void testToString() {
        // Given
        course.setId(123L);

        // When
        String toString = course.toString();

        // Then
        assertThat(toString).contains("Course{");
        assertThat(toString).contains("id=123");
        assertThat(toString).contains("code='" + courseCode + "'");
        assertThat(toString).contains("name='" + name + "'");
        assertThat(toString).contains("semester='" + semester + "'");
        assertThat(toString).contains("lecturerId=" + lecturerId);
        assertThat(toString).contains("budgetAllocated=" + budgetAllocated);
        assertThat(toString).contains("budgetUsed=" + Money.zero());
        assertThat(toString).contains("isActive=true");
    }

    @Test
    void testBudgetCalculationScenarios() {
        // Scenario 1: Fresh course with no budget used
        course.setBudgetAllocated(new BigDecimal("10000.00"));
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(new BigDecimal("10000.00"));
        assertThat(course.hasSufficientBudget(new BigDecimal("5000.00"))).isTrue();

        // Scenario 2: Partially used budget
        course.addToBudgetUsed(new BigDecimal("3000.00"));
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(new BigDecimal("7000.00"));
        assertThat(course.hasSufficientBudget(new BigDecimal("7000.00"))).isTrue();
        assertThat(course.hasSufficientBudget(new BigDecimal("8000.00"))).isFalse();

        // Scenario 3: Over budget
        course.addToBudgetUsed(new BigDecimal("8000.00")); // Total used: 11000
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("11000.00"));
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(new BigDecimal("-1000.00"));
        assertThat(course.hasSufficientBudget(new BigDecimal("100.00"))).isFalse();
    }

    @Test
    void testBudgetModificationOperations() {
        // Given - Start with some budget used
        course.setBudgetAllocated(new BigDecimal("5000.00"));
        course.setBudgetUsed(new BigDecimal("2000.00"));

        // Test multiple additions
        course.addToBudgetUsed(new BigDecimal("500.00"));
        course.addToBudgetUsed(new BigDecimal("300.00"));
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("2800.00"));

        // Test subtraction (e.g., refund scenario)
        course.subtractFromBudgetUsed(new BigDecimal("200.00"));
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("2600.00"));

        // Verify remaining budget calculation
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(new BigDecimal("2400.00"));
    }

    @Test
    void testNullBudgetHandling() {
        // Test with null budget allocated
        course.setBudgetAllocated((Money) null);
        assertThat(course.getBudgetAllocated()).isNull();
        assertThat(course.getBudgetAllocatedMoney()).isNull();

        // Test with null budget used
        course.setBudgetUsed((Money) null);
        assertThat(course.getBudgetUsed()).isNull();
        assertThat(course.getBudgetUsedMoney()).isNull();
    }

    @Test
    void testCodeNullHandling() {
        // Test with null course code object
        course.setCode((CourseCode) null);
        assertThat(course.getCode()).isNull();
        assertThat(course.getCodeValue()).isNull();
        assertThat(course.getCourseCodeObject()).isNull();
    }

    @Test
    void testBudgetPrecisionHandling() {
        // Test with precise decimal values
        course.setBudgetAllocated(new BigDecimal("1000.56"));
        course.setBudgetUsed(new BigDecimal("123.45"));

        assertThat(course.getBudgetAllocated()).isEqualByComparingTo(new BigDecimal("1000.56"));
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("123.45"));
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(new BigDecimal("877.11"));

        // Test addition with precise values
        course.addToBudgetUsed(new BigDecimal("0.01"));
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("123.46"));
    }

    @Test
    void testDifferentSemesterFormats() {
        // Test various semester formats
        String[] semesters = {"2024S1", "2024S2", "2024Summer", "2025S1", "2023S2"};
        
        for (String sem : semesters) {
            course.setSemester(sem);
            assertThat(course.getSemester()).isEqualTo(sem);
        }
    }

    @Test
    void testActiveCourseManagement() {
        // Test course starts as active
        assertThat(course.getIsActive()).isTrue();

        // Test deactivation
        course.setIsActive(false);
        assertThat(course.getIsActive()).isFalse();

        // Test reactivation
        course.setIsActive(true);
        assertThat(course.getIsActive()).isTrue();

        // Test null handling
        course.setIsActive(null);
        assertThat(course.getIsActive()).isNull();
    }

    @Test
    void testBudgetOperationsChaining() {
        // Test that budget operations can be chained logically
        course.setBudgetAllocated(new BigDecimal("10000.00"));
        course.setBudgetUsed(new BigDecimal("1000.00"));

        // Simulate multiple timesheet approvals
        course.addToBudgetUsed(new BigDecimal("500.00")); // Timesheet 1
        course.addToBudgetUsed(new BigDecimal("750.00")); // Timesheet 2
        course.addToBudgetUsed(new BigDecimal("1200.00")); // Timesheet 3
        
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("3450.00"));
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(new BigDecimal("6550.00"));

        // Simulate a refund/adjustment
        course.subtractFromBudgetUsed(new BigDecimal("200.00"));
        
        assertThat(course.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("3250.00"));
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(new BigDecimal("6750.00"));
    }

    @Test
    void testEdgeCaseBudgetScenarios() {
        // Test zero budget allocated
        course.setBudgetAllocated(BigDecimal.ZERO);
        course.setBudgetUsed(BigDecimal.ZERO);
        
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(course.hasSufficientBudget(BigDecimal.ZERO)).isTrue();
        assertThat(course.hasSufficientBudget(new BigDecimal("0.01"))).isFalse();

        // Test exact budget match
        course.setBudgetAllocated(new BigDecimal("1000.00"));
        course.setBudgetUsed(new BigDecimal("1000.00"));
        
        assertThat(course.getBudgetRemainingAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(course.hasSufficientBudget(BigDecimal.ZERO)).isTrue();
        assertThat(course.hasSufficientBudget(new BigDecimal("0.01"))).isFalse();
    }
}
