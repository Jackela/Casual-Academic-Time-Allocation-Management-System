package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Tests for TutorialCalculationStrategy.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("TutorialCalculationStrategy Tests")
class TutorialCalculationStrategyTest {

    private TutorialCalculationStrategy strategy;
    private Schedule1PolicyProvider policyProvider;
    private Schedule1PolicyProvider.RatePolicy ratePolicy;

    @BeforeEach
    void setUp() {
        strategy = new TutorialCalculationStrategy();
        policyProvider = mock(Schedule1PolicyProvider.class);
        ratePolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
    }

    @Test
    @DisplayName("should support TUTORIAL task type")
    void shouldSupportTutorialTaskType() {
        assertThat(strategy.supports(TimesheetTaskType.TUTORIAL)).isTrue();
        assertThat(strategy.supports(TimesheetTaskType.LECTURE)).isFalse();
        assertThat(strategy.supports(TimesheetTaskType.ORAA)).isFalse();
    }

    @Nested
    @DisplayName("Standard Tutorial Tests")
    class StandardTutorialTests {

        @Test
        @DisplayName("should resolve TU2 rate code for standard tutorial with STANDARD qualification")
        void shouldResolveTu2ForStandardTutorial() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(
                TutorQualification.STANDARD, false
            );
            when(policyProvider.resolvePolicyByRateCode("TU2", TutorQualification.STANDARD, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolvePolicyByRateCode("TU2", TutorQualification.STANDARD, input.getSessionDate());
        }

        @Test
        @DisplayName("should resolve TU1 rate code for standard tutorial with PHD qualification")
        void shouldResolveTu1ForPhdTutorial() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(
                TutorQualification.PHD, false
            );
            when(policyProvider.resolvePolicyByRateCode("TU1", TutorQualification.PHD, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolvePolicyByRateCode("TU1", TutorQualification.PHD, input.getSessionDate());
        }
    }

    @Nested
    @DisplayName("Repeat Tutorial Tests")
    class RepeatTutorialTests {

        @Test
        @DisplayName("should resolve TU4 rate code for repeat tutorial with STANDARD qualification")
        void shouldResolveTu4ForStandardRepeatTutorial() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(
                TutorQualification.STANDARD, true
            );
            when(policyProvider.resolvePolicyByRateCode("TU4", TutorQualification.STANDARD, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolvePolicyByRateCode("TU4", TutorQualification.STANDARD, input.getSessionDate());
        }

        @Test
        @DisplayName("should resolve TU3 rate code for repeat tutorial with PHD qualification")
        void shouldResolveTu3ForPhdRepeatTutorial() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(
                TutorQualification.PHD, true
            );
            when(policyProvider.resolvePolicyByRateCode("TU3", TutorQualification.PHD, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolvePolicyByRateCode("TU3", TutorQualification.PHD, input.getSessionDate());
        }
    }

    @Nested
    @DisplayName("Coordinator Qualification Tests")
    class CoordinatorQualificationTests {

        @Test
        @DisplayName("should use COORDINATOR as policy qualification for high band")
        void shouldUseCoordinatorAsPolicyQualificationForHighBand() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(
                TutorQualification.COORDINATOR, false
            );
            when(policyProvider.resolvePolicyByRateCode("TU1", TutorQualification.COORDINATOR, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolvePolicyByRateCode("TU1", TutorQualification.COORDINATOR, input.getSessionDate());
        }

        @Test
        @DisplayName("should fallback to PHD policy when COORDINATOR not found")
        void shouldFallbackToPhdWhenCoordinatorNotFound() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(
                TutorQualification.COORDINATOR, false
            );
            when(policyProvider.resolvePolicyByRateCode("TU1", TutorQualification.COORDINATOR, input.getSessionDate()))
                .thenThrow(new Schedule1PolicyProvider.RatePolicyNotFoundException("Not found"));
            when(policyProvider.resolveTutorialPolicy(TutorQualification.COORDINATOR, false, input.getSessionDate()))
                .thenThrow(new Schedule1PolicyProvider.RatePolicyNotFoundException("Not found"));
            when(policyProvider.resolveTutorialPolicy(TutorQualification.PHD, false, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolveTutorialPolicy(TutorQualification.PHD, false, input.getSessionDate());
        }
    }

    @Nested
    @DisplayName("Fallback Tests")
    class FallbackTests {

        @Test
        @DisplayName("should fallback to resolveTutorialPolicy when rate code not found")
        void shouldFallbackToResolveTutorialPolicy() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(
                TutorQualification.STANDARD, false
            );
            when(policyProvider.resolvePolicyByRateCode("TU2", TutorQualification.STANDARD, input.getSessionDate()))
                .thenThrow(new Schedule1PolicyProvider.RatePolicyNotFoundException("Not found"));
            when(policyProvider.resolveTutorialPolicy(TutorQualification.STANDARD, false, input.getSessionDate()))
                .thenReturn(ratePolicy);

            // When
            Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

            // Then
            assertThat(result).isEqualTo(ratePolicy);
            verify(policyProvider).resolveTutorialPolicy(TutorQualification.STANDARD, false, input.getSessionDate());
        }

        @Test
        @DisplayName("should propagate exception when all fallbacks fail")
        void shouldPropagateExceptionWhenAllFallbacksFail() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
            // Given
            Schedule1Calculator.CalculationInput input = createInput(
                TutorQualification.STANDARD, false
            );
            when(policyProvider.resolvePolicyByRateCode(anyString(), any(), any()))
                .thenThrow(new Schedule1PolicyProvider.RatePolicyNotFoundException("Not found"));
            when(policyProvider.resolveTutorialPolicy(any(), anyBoolean(), any()))
                .thenThrow(new Schedule1PolicyProvider.RatePolicyNotFoundException("Not found"));

            // Then
            assertThatThrownBy(() -> strategy.resolvePolicy(input, policyProvider))
                .isInstanceOf(Schedule1PolicyProvider.RatePolicyNotFoundException.class)
                .hasMessageContaining("Not found");
        }
    }

    private Schedule1Calculator.CalculationInput createInput(
            TutorQualification qualification, boolean repeat) {
        return new Schedule1Calculator.CalculationInput(
            TimesheetTaskType.TUTORIAL,
            LocalDate.of(2024, 7, 8),
            BigDecimal.ONE,
            repeat,
            qualification
        );
    }
}
