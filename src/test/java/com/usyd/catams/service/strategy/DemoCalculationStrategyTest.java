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
 * Tests for DemoCalculationStrategy.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("DemoCalculationStrategy Tests")
class DemoCalculationStrategyTest {

    private DemoCalculationStrategy strategy;
    private Schedule1PolicyProvider policyProvider;
    private Schedule1PolicyProvider.RatePolicy ratePolicy;

    @BeforeEach
    void setUp() {
        strategy = new DemoCalculationStrategy();
        policyProvider = mock(Schedule1PolicyProvider.class);
        ratePolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
    }

    @Test
    @DisplayName("should support DEMO task type")
    void shouldSupportDemoTaskType() {
        assertThat(strategy.supports(TimesheetTaskType.DEMO)).isTrue();
        assertThat(strategy.supports(TimesheetTaskType.TUTORIAL)).isFalse();
        assertThat(strategy.supports(TimesheetTaskType.ORAA)).isFalse();
    }

    @Test
    @DisplayName("should resolve DE1 for high band qualification")
    void shouldResolveDe1ForHighBand() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(TutorQualification.PHD);
        when(policyProvider.resolvePolicyByRateCode("DE1", TutorQualification.PHD, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("DE1", TutorQualification.PHD, input.getSessionDate());
    }

    @Test
    @DisplayName("should resolve DE2 for standard qualification")
    void shouldResolveDe2ForStandard() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(TutorQualification.STANDARD);
        when(policyProvider.resolvePolicyByRateCode("DE2", TutorQualification.STANDARD, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("DE2", TutorQualification.STANDARD, input.getSessionDate());
    }

    @Test
    @DisplayName("should use COORDINATOR as policy qualification for coordinator")
    void shouldUseCoordinatorForCoordinator() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(TutorQualification.COORDINATOR);
        when(policyProvider.resolvePolicyByRateCode("DE1", TutorQualification.COORDINATOR, input.getSessionDate()))
            .thenReturn(ratePolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(ratePolicy);
        verify(policyProvider).resolvePolicyByRateCode("DE1", TutorQualification.COORDINATOR, input.getSessionDate());
    }

    private Schedule1Calculator.CalculationInput createInput(TutorQualification qualification) {
        return new Schedule1Calculator.CalculationInput(
            TimesheetTaskType.DEMO,
            LocalDate.of(2024, 7, 8),
            BigDecimal.ONE,
            false,
            qualification
        );
    }
}
