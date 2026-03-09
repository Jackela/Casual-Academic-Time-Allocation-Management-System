package com.usyd.catams.service;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.repository.PolicyVersionRepository;
import com.usyd.catams.repository.RateAmountRepository;
import com.usyd.catams.repository.RateCodeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * TDD placeholder: defines the contract for Schedule1PolicyProvider.
 * This test intentionally references the yet-to-be-created provider so the build goes red.
 */
class Schedule1PolicyProviderTest {

    @Test
    void shouldFailFastWhenTutorialRateCodesMissing() {
        RateCodeRepository rateCodeRepository = mock(RateCodeRepository.class);
        RateAmountRepository rateAmountRepository = mock(RateAmountRepository.class);
        PolicyVersionRepository policyVersionRepository = mock(PolicyVersionRepository.class);
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(new String[] {"prod"});
        when(rateCodeRepository.findByTaskType(TimesheetTaskType.TUTORIAL)).thenReturn(java.util.List.of());

        assertThatThrownBy(() -> new Schedule1PolicyProvider(
            rateCodeRepository, rateAmountRepository, policyVersionRepository, environment
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("No tutorial rate codes configured");
    }
}
