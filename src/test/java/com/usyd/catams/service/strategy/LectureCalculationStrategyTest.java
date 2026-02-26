package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Tests for LectureCalculationStrategy.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("LectureCalculationStrategy Tests")
class LectureCalculationStrategyTest {

    private LectureCalculationStrategy strategy;
    private Schedule1PolicyProvider policyProvider;
    private Schedule1PolicyProvider.RatePolicy ratePolicy;

    @BeforeEach
    void setUp() {
        strategy = new LectureCalculationStrategy();
        policyProvider = mock(Schedule1PolicyProvider.class);
        ratePolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
    }

    @Test
    @DisplayName("should support LECTURE task type")
    void shouldSupportLectureTaskType() {
        assertThat(strategy.supports(TimesheetTaskType.LECTURE)).isTrue();
        assertThat(strategy.supports(TimesheetTaskType.TUTORIAL)).isFalse();
        assertThat(strategy.supports(TimesheetTaskType.ORAA)).isFalse();
    }

    @Test
    @DisplayName("should resolve P04 rate code for repeat lecture")
    void shouldResolveP04ForRepeatLecture() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(BigDecimal.valueOf(2), true, TutorQualification.STANDARD);
        when(policyProvider.resolvePolicyByRateCode("P04", null, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("P04", null, input.getSessionDate());
    }

    @Test
    @DisplayName("should resolve P02 for developed lecture with delivery hours > 1")
    void shouldResolveP02ForDevelopedLecture() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(BigDecimal.valueOf(2), false, TutorQualification.STANDARD);
        when(policyProvider.resolvePolicyByRateCode("P02", null, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("P02", null, input.getSessionDate());
    }

    @Test
    @DisplayName("should resolve P02 for lecture with COORDINATOR qualification")
    void shouldResolveP02ForCoordinatorLecture() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(BigDecimal.ONE, false, TutorQualification.COORDINATOR);
        when(policyProvider.resolvePolicyByRateCode("P02", null, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("P02", null, input.getSessionDate());
    }

    @Test
    @DisplayName("should resolve P03 for standard lecture")
    void shouldResolveP03ForStandardLecture() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(BigDecimal.ONE, false, TutorQualification.STANDARD);
        when(policyProvider.resolvePolicyByRateCode("P03", null, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("P03", null, input.getSessionDate());
    }

    private Schedule1Calculator.CalculationInput createInput(
            BigDecimal deliveryHours, boolean repeat, TutorQualification qualification) {
        return new Schedule1Calculator.CalculationInput(
            TimesheetTaskType.LECTURE,
            LocalDate.of(2024, 7, 8),
            deliveryHours,
            repeat,
            qualification
        );
    }
}
