package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

/**
 * Calculation strategy for Other task type.
 * 
 * Maps to standard ORAA rate as a fallback for miscellaneous academic activities.
 * Uses the same rate codes and normalization as ORAA.
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class OtherCalculationStrategy extends AbstractTaskCalculationStrategy {
    
    @Override
    public boolean supports(TimesheetTaskType taskType) {
        return taskType == TimesheetTaskType.OTHER;
    }
    
    @Override
    public Schedule1PolicyProvider.RatePolicy resolvePolicy(
            Schedule1Calculator.CalculationInput input,
            Schedule1PolicyProvider policyProvider) throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        throw new IllegalArgumentException(
                "Task type OTHER has no implicit Schedule 1 mapping. "
                        + "Provide an explicit task type strategy instead.");
    }
    
    @Override
    public String normalizeRateCode(String rawRateCode, Schedule1Calculator.CalculationInput input) {
        // Same normalization as ORAA
        if ("AO1_DE1".equals(rawRateCode)) {
            return "AO1";
        }
        if ("AO2_DE2".equals(rawRateCode)) {
            return "AO2";
        }
        return rawRateCode;
    }
}
