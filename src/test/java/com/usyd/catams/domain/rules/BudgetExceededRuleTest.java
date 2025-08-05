package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.entity.Course;
import com.usyd.catams.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link BudgetExceededRule}.
 * Verifies that the rule correctly identifies when a timesheet would exceed the course budget.
 */
class BudgetExceededRuleTest {

    private BudgetExceededRule budgetExceededRule;

    @BeforeEach
    void setUp() {
        budgetExceededRule = new BudgetExceededRule();
    }

    /**
     * Tests that the rule passes when the timesheet does not exceed the budget.
     */
    @Test
    void whenTimesheetDoesNotExceedBudget_shouldPass() {
        Course course = new Course();
        course.setBudgetAllocated(new BigDecimal("1000.00"));
        course.setBudgetUsed(new BigDecimal("500.00"));
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, course, null, new BigDecimal("10.0"), new BigDecimal("40.00"), null); // New pay: 400

        assertThatCode(() -> budgetExceededRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    /**
     * Tests that the rule passes when the timesheet exactly meets the budget limit.
     */
    @Test
    void whenTimesheetExactlyMeetsBudget_shouldPass() {
        Course course = new Course();
        course.setBudgetAllocated(new BigDecimal("1000.00"));
        course.setBudgetUsed(new BigDecimal("600.00"));
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, course, null, new BigDecimal("10.0"), new BigDecimal("40.00"), null); // New pay: 400

        assertThatCode(() -> budgetExceededRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    /**
     * Tests that the rule throws a BusinessException when the timesheet exceeds the budget.
     */
    @Test
    void whenTimesheetExceedsBudget_shouldThrowException() {
        Course course = new Course();
        course.setBudgetAllocated(new BigDecimal("1000.00"));
        course.setBudgetUsed(new BigDecimal("600.01")); // Already slightly over
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, course, null, new BigDecimal("10.0"), new BigDecimal("40.00"), null); // New pay: 400

        assertThatThrownBy(() -> budgetExceededRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("exceed the course budget");
    }

    /**
     * Tests that the rule throws a BusinessException when hours are null.
     */
    @Test
    void whenHoursAreNull_shouldThrowException() {
        Course course = new Course();
        course.setBudgetAllocated(new BigDecimal("1000.00"));
        course.setBudgetUsed(new BigDecimal("500.00"));
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, course, null, null, new BigDecimal("40.00"), null);

        assertThatThrownBy(() -> budgetExceededRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class);
    }

    /**
     * Tests that the rule throws a BusinessException when hourly rate is null.
     */
    @Test
    void whenHourlyRateIsNull_shouldThrowException() {
        Course course = new Course();
        course.setBudgetAllocated(new BigDecimal("1000.00"));
        course.setBudgetUsed(new BigDecimal("500.00"));
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, course, null, new BigDecimal("10.0"), null, null);

        assertThatThrownBy(() -> budgetExceededRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class);
    }
}
