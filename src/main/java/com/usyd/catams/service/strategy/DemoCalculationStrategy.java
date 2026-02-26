package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

/**
 * Calculation strategy for Demo task type.
 * 
 * Handles:
 * - High band: DE1
 * - Standard band: DE2
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class DemoCalculationStrategy extends AbstractTaskCalculationStrategy {
    
    @Override
    public boolean supports(TimesheetTaskType taskType) {
        return taskType == TimesheetTaskType.DEMO;
    }
    
    @Override
    public Schedule1PolicyProvider.RatePolicy resolvePolicy(
            Schedule1Calculator.CalculationInput input,
            Schedule1PolicyProvider policyProvider) throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        
        TutorQualification qualification = input.getQualification();
        boolean highBand = isHighBand(qualification);
        
        String rateCode = highBand ? "DE1" : "DE2";
        TutorQualification policyQualification = highBand
                ? resolveHighBandQualification(qualification)
                : TutorQualification.STANDARD;
        
        return policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, input.getSessionDate());
    }
}
