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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Tests for OtherCalculationStrategy.
 * 
 * Other task type maps to standard ORAA rate as a fallback for miscellaneous academic activities.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("OtherCalculationStrategy Tests")
class OtherCalculationStrategyTest {

    private OtherCalculationStrategy strategy;
    private Schedule1PolicyProvider policyProvider;
    private Schedule1PolicyProvider.RatePolicy ratePolicy;

    @BeforeEach
    void setUp() {
        strategy = new OtherCalculationStrategy();
        policyProvider = mock(Schedule1PolicyProvider.class);
        ratePolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
    }

    @Test
    @DisplayName("should support OTHER task type")
    void shouldSupportOtherTaskType() {
        assertThat(strategy.supports(TimesheetTaskType.OTHER)).isTrue();
        assertThat(strategy.supports(TimesheetTaskType.TUTORIAL)).isFalse();
        assertThat(strategy.supports(TimesheetTaskType.ORAA)).isFalse();
    }

    @Test
    @DisplayName("should reject implicit fallback mapping for high band qualification")
    void shouldRejectImplicitFallbackForHighBand() {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(TutorQualification.PHD);

        // When
        assertThatThrownBy(() -> strategy.resolvePolicy(input, policyProvider))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no implicit Schedule 1 mapping");
        verifyNoInteractions(policyProvider);
    }

    @Test
    @DisplayName("should reject implicit fallback mapping for standard qualification")
    void shouldRejectImplicitFallbackForStandard() {
        // Given
        Schedule1Calculator.CalculationInput input = createInput(TutorQualification.STANDARD);

        // When
        assertThatThrownBy(() -> strategy.resolvePolicy(input, policyProvider))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no implicit Schedule 1 mapping");
        verifyNoInteractions(policyProvider);
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

    private Schedule1Calculator.CalculationInput createInput(TutorQualification qualification) {
        return new Schedule1Calculator.CalculationInput(
            TimesheetTaskType.OTHER,
            LocalDate.of(2024, 7, 8),
            BigDecimal.ONE,
            false,
            qualification
        );
    }
}
