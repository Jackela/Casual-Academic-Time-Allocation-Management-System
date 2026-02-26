package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
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
        
        TutorQualification qualification = input.getQualification();
        boolean highBand = isHighBand(qualification);
        
        // Other maps to ORAA rate codes
        String rateCode = highBand ? "AO1_DE1" : "AO2_DE2";
        TutorQualification policyQualification = highBand
                ? resolveHighBandQualification(qualification)
                : TutorQualification.STANDARD;
        
        return policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, input.getSessionDate());
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
