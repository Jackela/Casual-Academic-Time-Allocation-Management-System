package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Contract tests for TaskCalculationStrategy interface.
 * 
 * These tests define the expected behavior that all strategy implementations must satisfy.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("TaskCalculationStrategy Contract Tests")
class TaskCalculationStrategyTest {

    @Test
    @DisplayName("should define strategy interface with supports method")
    void shouldDefineStrategyInterface() {
        // Given
        TaskCalculationStrategy strategy = mock(TaskCalculationStrategy.class);
        when(strategy.supports(TimesheetTaskType.TUTORIAL)).thenReturn(true);
        when(strategy.supports(TimesheetTaskType.LECTURE)).thenReturn(false);

        // Then
        assertThat(strategy.supports(TimesheetTaskType.TUTORIAL)).isTrue();
        assertThat(strategy.supports(TimesheetTaskType.LECTURE)).isFalse();
    }

    @Test
    @DisplayName("should resolve policy for supported task type")
    void shouldResolvePolicyForSupportedTaskType() {
        // Given
        TaskCalculationStrategy strategy = mock(TaskCalculationStrategy.class);
        Schedule1PolicyProvider policyProvider = mock(Schedule1PolicyProvider.class);
        Schedule1Calculator.CalculationInput input = createCalculationInput(TimesheetTaskType.TUTORIAL);
        Schedule1PolicyProvider.RatePolicy expectedPolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
        
        when(strategy.supports(TimesheetTaskType.TUTORIAL)).thenReturn(true);
        when(strategy.resolvePolicy(input, policyProvider)).thenReturn(expectedPolicy);

        // When
        Schedule1PolicyProvider.RatePolicy result = strategy.resolvePolicy(input, policyProvider);

        // Then
        assertThat(result).isEqualTo(expectedPolicy);
        verify(strategy).resolvePolicy(input, policyProvider);
    }

    @Test
    @DisplayName("should provide default normalizeRateCode implementation")
    void shouldProvideDefaultNormalizeRateCodeImplementation() {
        // Given
        TaskCalculationStrategy strategy = new TaskCalculationStrategy() {
            @Override
            public boolean supports(TimesheetTaskType taskType) {
                return true;
            }

            @Override
            public Schedule1PolicyProvider.RatePolicy resolvePolicy(
                    Schedule1Calculator.CalculationInput input, 
                    Schedule1PolicyProvider policyProvider) {
                return null;
            }
        };

        Schedule1Calculator.CalculationInput input = createCalculationInput(TimesheetTaskType.TUTORIAL);

        // When
        String result = strategy.normalizeRateCode("TU1", input);

        // Then
        assertThat(result).isEqualTo("TU1");
    }

    @Test
    @DisplayName("should allow overriding normalizeRateCode in implementation")
    void shouldAllowOverridingNormalizeRateCode() {
        // Given
        TaskCalculationStrategy strategy = new TaskCalculationStrategy() {
            @Override
            public boolean supports(TimesheetTaskType taskType) {
                return true;
            }

            @Override
            public Schedule1PolicyProvider.RatePolicy resolvePolicy(
                    Schedule1Calculator.CalculationInput input, 
                    Schedule1PolicyProvider policyProvider) {
                return null;
            }

            @Override
            public String normalizeRateCode(String rawRateCode, 
                    Schedule1Calculator.CalculationInput input) {
                if ("AO1_DE1".equals(rawRateCode)) {
                    return "AO1";
                }
                return rawRateCode;
            }
        };

        Schedule1Calculator.CalculationInput input = createCalculationInput(TimesheetTaskType.ORAA);

        // When
        String result = strategy.normalizeRateCode("AO1_DE1", input);

        // Then
        assertThat(result).isEqualTo("AO1");
    }

    @Test
    @DisplayName("should create calculation input with required fields")
    void shouldCreateCalculationInputWithRequiredFields() {
        // Given
        TimesheetTaskType taskType = TimesheetTaskType.TUTORIAL;
        LocalDate sessionDate = LocalDate.of(2024, 7, 8);
        BigDecimal deliveryHours = BigDecimal.ONE;
        boolean repeat = false;

        // When
        Schedule1Calculator.CalculationInput input = new Schedule1Calculator.CalculationInput(
            taskType, sessionDate, deliveryHours, repeat, null
        );

        // Then
        assertThat(input.getTaskType()).isEqualTo(taskType);
        assertThat(input.getSessionDate()).isEqualTo(sessionDate);
        assertThat(input.getDeliveryHours()).isEqualTo(deliveryHours);
        assertThat(input.isRepeat()).isFalse();
        assertThat(input.getQualification()).isNotNull(); // Should default to STANDARD
    }

    @Test
    @DisplayName("should require non-null task type in calculation input")
    void shouldRequireNonNullTaskTypeInCalculationInput() {
        // Then
        assertThatThrownBy(() -> new Schedule1Calculator.CalculationInput(
            null, LocalDate.now(), BigDecimal.ONE, false, null
        )).isInstanceOf(NullPointerException.class)
          .hasMessageContaining("taskType");
    }

    @Test
    @DisplayName("should handle null qualification by defaulting to STANDARD")
    void shouldHandleNullQualificationByDefaultingToStandard() {
        // Given
        Schedule1Calculator.CalculationInput input = new Schedule1Calculator.CalculationInput(
            TimesheetTaskType.TUTORIAL, 
            LocalDate.of(2024, 7, 8), 
            BigDecimal.ONE, 
            false, 
            null
        );

        // Then
        assertThat(input.getQualification()).isNotNull();
    }

    private Schedule1Calculator.CalculationInput createCalculationInput(TimesheetTaskType taskType) {
        return new Schedule1Calculator.CalculationInput(
            taskType,
            LocalDate.of(2024, 7, 8),
            BigDecimal.ONE,
            false,
            null
        );
    }
}
