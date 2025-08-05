package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link FutureDateRule}.
 * Verifies that the rule correctly identifies and rejects timesheet dates in the future.
 */
class FutureDateRuleTest {

    private FutureDateRule futureDateRule;

    @BeforeEach
    void setUp() {
        futureDateRule = new FutureDateRule();
    }

    /**
     * Tests that the rule passes when the week start date is in the past.
     */
    @Test
    void whenDateIsInPast_shouldPass() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, LocalDate.now().minusDays(1), null, null, null);
        assertThatCode(() -> futureDateRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    /**
     * Tests that the rule passes when the week start date is today.
     */
    @Test
    void whenDateIsToday_shouldPass() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, LocalDate.now(), null, null, null);
        assertThatCode(() -> futureDateRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    /**
     * Tests that the rule throws a BusinessException when the week start date is in the future.
     */
    @Test
    void whenDateIsFuture_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, LocalDate.now().plusDays(1), null, null, null);
        assertThatThrownBy(() -> futureDateRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Week start date cannot be in the future");
    }

    /**
     * Tests that the rule throws a BusinessException when the week start date is null.
     * This validates defensive null validation rather than allowing NPE.
     */
    @Test
    void whenDateIsNull_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, null, null);
        assertThatThrownBy(() -> futureDateRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Week start date cannot be null for future date validation");
    }
}
