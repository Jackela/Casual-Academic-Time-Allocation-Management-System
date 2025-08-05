
package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HourlyRateRangeRuleTest {

    private HourlyRateRangeRule hourlyRateRangeRule;

    @BeforeEach
    void setUp() {
        hourlyRateRangeRule = new HourlyRateRangeRule();
    }

    @Test
    void whenHourlyRateIsWithinRange_shouldPass() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, new BigDecimal("50.00"), null);
        assertThatCode(() -> hourlyRateRangeRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    @Test
    void whenHourlyRateIsAtMinValue_shouldPass() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, new BigDecimal("10.00"), null);
        assertThatCode(() -> hourlyRateRangeRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    @Test
    void whenHourlyRateIsAtMaxValue_shouldPass() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, new BigDecimal("200.00"), null);
        assertThatCode(() -> hourlyRateRangeRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    @Test
    void whenHourlyRateIsBelowMinValue_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, new BigDecimal("9.99"), null);
        assertThatThrownBy(() -> hourlyRateRangeRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Hourly rate must be between");
    }

    @Test
    void whenHourlyRateIsAboveMaxValue_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, new BigDecimal("200.01"), null);
        assertThatThrownBy(() -> hourlyRateRangeRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Hourly rate must be between");
    }

    @Test
    void whenHourlyRateIsZero_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, BigDecimal.ZERO, null);
        assertThatThrownBy(() -> hourlyRateRangeRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Hourly rate must be between");
    }

    @Test
    void whenHourlyRateIsNegative_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, new BigDecimal("-1.00"), null);
        assertThatThrownBy(() -> hourlyRateRangeRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Hourly rate must be between");
    }

    @Test
    void whenHourlyRateIsNull_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, null, null);
        assertThatThrownBy(() -> hourlyRateRangeRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Hourly rate must be between");
    }
}

