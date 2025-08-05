
package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HoursRangeRuleTest {

    private HoursRangeRule hoursRangeRule;

    @BeforeEach
    void setUp() {
        hoursRangeRule = new HoursRangeRule();
        ReflectionTestUtils.setField(hoursRangeRule, "maxHours", new BigDecimal("40"));
    }

    @Test
    void whenHoursAreWithinRange_shouldPass() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, new BigDecimal("10.0"), null, null);
        assertThatCode(() -> hoursRangeRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    @Test
    void whenHoursAreAtMinValue_shouldPass() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, new BigDecimal("0.1"), null, null);
        assertThatCode(() -> hoursRangeRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    @Test
    void whenHoursAreAtMaxValue_shouldPass() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, new BigDecimal("40"), null, null);
        assertThatCode(() -> hoursRangeRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }

    @Test
    void whenHoursAreBelowMinValue_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, new BigDecimal("0.09"), null, null);
        assertThatThrownBy(() -> hoursRangeRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Hours must be between");
    }

    @Test
    void whenHoursAreAboveMaxValue_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, new BigDecimal("40.1"), null, null);
        assertThatThrownBy(() -> hoursRangeRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Hours must be between");
    }

    @Test
    void whenHoursAreNull_shouldThrowException() {
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, null, null, null, null);
        assertThatThrownBy(() -> hoursRangeRule.isSatisfiedBy(context))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Hours must be between");
    }
}

