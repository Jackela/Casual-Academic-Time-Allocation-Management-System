package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

/**
 * Calculation strategy for Marking task type.
 * 
 * Handles:
 * - High band: M04
 * - Standard band: M05
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class MarkingCalculationStrategy extends AbstractTaskCalculationStrategy {
    
    @Override
    public boolean supports(TimesheetTaskType taskType) {
        return taskType == TimesheetTaskType.MARKING;
    }
    
    @Override
    public Schedule1PolicyProvider.RatePolicy resolvePolicy(
            Schedule1Calculator.CalculationInput input,
            Schedule1PolicyProvider policyProvider) throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        
        TutorQualification qualification = input.getQualification();
        boolean highBand = isHighBand(qualification);
        
        String rateCode = highBand ? "M04" : "M05";
        TutorQualification policyQualification = highBand
                ? resolveHighBandQualification(qualification)
                : TutorQualification.STANDARD;
        
        return policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, input.getSessionDate());
    }
}
