package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

/**
 * Calculation strategy for ORAA (Oral Assessment) task type.
 * 
 * Handles:
 * - High band: AO1_DE1 → displays as AO1
 * - Standard band: AO2_DE2 → displays as AO2
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class OraaCalculationStrategy extends AbstractTaskCalculationStrategy {
    
    @Override
    public boolean supports(TimesheetTaskType taskType) {
        return taskType == TimesheetTaskType.ORAA;
    }
    
    @Override
    public Schedule1PolicyProvider.RatePolicy resolvePolicy(
            Schedule1Calculator.CalculationInput input,
            Schedule1PolicyProvider policyProvider) throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        
        TutorQualification qualification = input.getQualification();
        boolean highBand = isHighBand(qualification);
        
        String rateCode = highBand ? "AO1_DE1" : "AO2_DE2";
        TutorQualification policyQualification = highBand
                ? resolveHighBandQualification(qualification)
                : TutorQualification.STANDARD;
        
        return policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, input.getSessionDate());
    }
    
    @Override
    public String normalizeRateCode(String rawRateCode, Schedule1Calculator.CalculationInput input) {
        if ("AO1_DE1".equals(rawRateCode)) {
            return "AO1";
        }
        if ("AO2_DE2".equals(rawRateCode)) {
            return "AO2";
        }
        return rawRateCode;
    }
}
