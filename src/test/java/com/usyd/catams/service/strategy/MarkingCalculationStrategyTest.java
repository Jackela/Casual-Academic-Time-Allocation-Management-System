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
 * Tests for MarkingCalculationStrategy.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("MarkingCalculationStrategy Tests")
class MarkingCalculationStrategyTest {

    private MarkingCalculationStrategy strategy;
    private Schedule1PolicyProvider policyProvider;
    private Schedule1PolicyProvider.RatePolicy ratePolicy;

    @BeforeEach
    void setUp() {
        strategy = new MarkingCalculationStrategy();
        policyProvider = mock(Schedule1PolicyProvider.class);
        ratePolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
    }

    @Test
    @DisplayName("should support MARKING task type")
    void shouldSupportMarkingTaskType() {
        assertThat(strategy.supports(TimesheetTaskType.MARKING)).isTrue();
        assertThat(strategy.supports(TimesheetTaskType.TUTORIAL)).isFalse();
        assertThat(strategy.supports(TimesheetTaskType.LECTURE)).isFalse();
    }

    @Test
    @DisplayName("should resolve M04 for high band qualification")
    void shouldResolveM04ForHighBand() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(TutorQualification.PHD);
        when(policyProvider.resolvePolicyByRateCode("M04", TutorQualification.PHD, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("M04", TutorQualification.PHD, input.getSessionDate());
    }

    @Test
    @DisplayName("should resolve M05 for standard qualification")
    void shouldResolveM05ForStandard() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(TutorQualification.STANDARD);
        when(policyProvider.resolvePolicyByRateCode("M05", TutorQualification.STANDARD, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("M05", TutorQualification.STANDARD, input.getSessionDate());
    }

    @Test
    @DisplayName("should use COORDINATOR as policy qualification for coordinator")
    void shouldUseCoordinatorForCoordinator() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(TutorQualification.COORDINATOR);
        when(policyProvider.resolvePolicyByRateCode("M04", TutorQualification.COORDINATOR, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("M04", TutorQualification.COORDINATOR, input.getSessionDate());
    }

    private Schedule1Calculator.CalculationInput createInput(TutorQualification qualification) {
        return new Schedule1Calculator.CalculationInput(
            TimesheetTaskType.MARKING,
            LocalDate.of(2024, 7, 8),
            BigDecimal.ONE,
            false,
            qualification
        );
    }
}
