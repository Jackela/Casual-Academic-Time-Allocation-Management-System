package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Calculation strategy for Tutorial task type.
 * 
 * Handles:
 * - Standard vs Repeat tutorials
 * - High band (PHD/COORDINATOR) vs Standard qualification
 * - Rate code mapping: TU1/TU2 (standard), TU3/TU4 (repeat)
 * - Fallback to PHD when COORDINATOR not found
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class TutorialCalculationStrategy extends AbstractTaskCalculationStrategy {
    
    @Override
    public boolean supports(TimesheetTaskType taskType) {
        return taskType == TimesheetTaskType.TUTORIAL;
    }
    
    @Override
    public Schedule1PolicyProvider.RatePolicy resolvePolicy(
            Schedule1Calculator.CalculationInput input,
            Schedule1PolicyProvider policyProvider) throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        
        TutorQualification qualification = input.getQualification();
        boolean isRepeat = input.isRepeat();
        
        boolean highBand = isHighBand(qualification);
        String rateCode = isRepeat
                ? (highBand ? "TU3" : "TU4")
                : (highBand ? "TU1" : "TU2");
        
        TutorQualification policyQualification = highBand
                ? resolveHighBandQualification(qualification)
                : TutorQualification.STANDARD;
        
        TutorQualification fallbackQualification = getFallbackQualification(policyQualification, qualification);
        
        try {
            return policyProvider.resolvePolicyByRateCode(rateCode, policyQualification, input.getSessionDate());
        } catch (Schedule1PolicyProvider.RatePolicyNotFoundException ex) {
            try {
                return policyProvider.resolveTutorialPolicy(
                        policyQualification,
                        isRepeat,
                        input.getSessionDate()
                );
            } catch (Schedule1PolicyProvider.RatePolicyNotFoundException nested) {
                if (fallbackQualification != null) {
                    return policyProvider.resolveTutorialPolicy(
                            fallbackQualification,
                            isRepeat,
                            input.getSessionDate()
                    );
                }
                throw nested;
            }
        }
    }
}
