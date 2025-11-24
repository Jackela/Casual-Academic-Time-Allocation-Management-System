package com.usyd.catams.domain.rules;

import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link FutureDateRule}.
 * Verifies that the rule correctly identifies and rejects timesheet dates in the future.
 */
@ExtendWith(MockitoExtension.class)
class FutureDateRuleTest {

    @Mock
    private Environment environment;

    private FutureDateRule futureDateRule;

    @BeforeEach
    void setUp() {
        // Mock environment to return empty active profiles (production-like behavior)
        when(environment.getActiveProfiles()).thenReturn(new String[]{});
        // Set env var to enable the rule for tests
        // Note: Since we can't easily set system env in tests, we rely on the default behavior
        // where the rule is enabled when not in e2e/demo profile
        futureDateRule = new FutureDateRule(true, environment);
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

    /**
     * Tests that the rule is disabled in e2e profile.
     */
    @Test
    void whenE2EProfile_shouldBeDisabled() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"e2e"});
        FutureDateRule disabledRule = new FutureDateRule(true, environment);

        // Future date should pass when rule is disabled
        TimesheetValidationContext context = new TimesheetValidationContext(null, null, null, LocalDate.now().plusDays(1), null, null, null);
        assertThatCode(() -> disabledRule.isSatisfiedBy(context)).doesNotThrowAnyException();
    }
}
