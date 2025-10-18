package com.usyd.catams.service;

import com.usyd.catams.enums.TutorQualification;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class Schedule1CalculatorTest {

    @Autowired
    private Schedule1Calculator calculator;

    @Test
    void shouldCalculateStandardTutorialRateFromSeededPolicyData() {
        Schedule1CalculationResult result = calculator.calculateTutorial(
                new Schedule1Calculator.TutorialInput(
                        LocalDate.of(2024, 7, 8),
                        BigDecimal.ONE,
                        false,
                        TutorQualification.STANDARD
                )
        );

        assertThat(result.getRateCode()).isEqualTo("TU2");
        assertThat(result.getAssociatedHours()).isEqualByComparingTo("2.0");
        assertThat(result.getPayableHours()).isEqualByComparingTo("3.0");
        assertThat(result.getAmount()).isEqualByComparingTo("175.94");
        assertThat(result.getFormula()).contains("1h").contains("2h associated");
    }
}
