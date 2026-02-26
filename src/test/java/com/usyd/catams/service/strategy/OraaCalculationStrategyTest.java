package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Tests for OraaCalculationStrategy.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("OraaCalculationStrategy Tests")
class OraaCalculationStrategyTest {

    private OraaCalculationStrategy strategy;
    private Schedule1PolicyProvider policyProvider;
    private Schedule1PolicyProvider.RatePolicy ratePolicy;

    @BeforeEach
    void setUp() {
        strategy = new OraaCalculationStrategy();
        policyProvider = mock(Schedule1PolicyProvider.class);
        ratePolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
    }

    @Test
    @DisplayName("should support ORAA task type")
    void shouldSupportOraaTaskType() {
        assertThat(strategy.supports(TimesheetTaskType.ORAA)).isTrue();
        assertThat(strategy.supports(TimesheetTaskType.TUTORIAL)).isFalse();
        assertThat(strategy.supports(TimesheetTaskType.LECTURE)).isFalse();
    }

    @Nested
    @DisplayName("High Band Tests")
    class HighBandTests {

        @Test
        @DisplayName("should resolve AO1_DE1 for PHD qualification")
        void shouldResolveAo1De1ForPhd() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(TutorQualification.PHD);
            when(policyProvider.resolvePolicyByRateCode("AO1_DE1", TutorQualification.PHD, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolvePolicyByRateCode("AO1_DE1", TutorQualification.PHD, input.getSessionDate());
        }

        @Test
        @DisplayName("should resolve AO1_DE1 for COORDINATOR qualification")
        void shouldResolveAo1De1ForCoordinator() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(TutorQualification.COORDINATOR);
            when(policyProvider.resolvePolicyByRateCode("AO1_DE1", TutorQualification.COORDINATOR, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolvePolicyByRateCode("AO1_DE1", TutorQualification.COORDINATOR, input.getSessionDate());
        }

        @Test
        @DisplayName("should normalize AO1_DE1 to AO1")
        void shouldNormalizeAo1De1ToAo1() {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(TutorQualification.PHD);

            // When
            String result = strategy.normalizeRateCode("AO1_DE1", input);

            // Then
            assertThat(result).isEqualTo("AO1");
        }
    }

    @Nested
    @DisplayName("Standard Band Tests")
    class StandardBandTests {

        @Test
        @DisplayName("should resolve AO2_DE2 for STANDARD qualification")
        void shouldResolveAo2De2ForStandard() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(TutorQualification.STANDARD);
            when(policyProvider.resolvePolicyByRateCode("AO2_DE2", TutorQualification.STANDARD, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolvePolicyByRateCode("AO2_DE2", TutorQualification.STANDARD, input.getSessionDate());
        }

        @Test
        @DisplayName("should normalize AO2_DE2 to AO2")
        void shouldNormalizeAo2De2ToAo2() {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(TutorQualification.STANDARD);

            // When
            String result = strategy.normalizeRateCode("AO2_DE2", input);

            // Then
            assertThat(result).isEqualTo("AO2");
        }
    }

    private Schedule1Calculator.CalculationInput createInput(TutorQualification qualification) {
        return new Schedule1Calculator.CalculationInput(
            TimesheetTaskType.ORAA,
            LocalDate.of(2024, 7, 8),
            BigDecimal.ONE,
            false,
            qualification
        );
    }
}
