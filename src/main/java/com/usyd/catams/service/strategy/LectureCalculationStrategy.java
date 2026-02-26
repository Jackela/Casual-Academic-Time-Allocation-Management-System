package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Calculation strategy for Lecture task type.
 * 
 * Handles:
 * - Repeat lectures (P04)
 * - Developed lectures with delivery hours > 1 or COORDINATOR (P02)
 * - Standard lectures (P03)
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class LectureCalculationStrategy extends AbstractTaskCalculationStrategy {
    
    @Override
    public boolean supports(TimesheetTaskType taskType) {
        return taskType == TimesheetTaskType.LECTURE;
    }
    
    @Override
    public Schedule1PolicyProvider.RatePolicy resolvePolicy(
            Schedule1Calculator.CalculationInput input,
            Schedule1PolicyProvider policyProvider) throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        
        BigDecimal deliveryHours = input.getDeliveryHours() != null ? input.getDeliveryHours() : BigDecimal.ZERO;
        TutorQualification qualification = input.getQualification();
        boolean isRepeat = input.isRepeat();
        
        String rateCode;
        if (isRepeat) {
            rateCode = "P04";
        } else if (isDevelopedLecture(deliveryHours, qualification)) {
            rateCode = "P02";
        } else {
            rateCode = "P03";
        }
        
        return policyProvider.resolvePolicyByRateCode(rateCode, null, input.getSessionDate());
    }
    
    /**
     * Determine if this is a developed lecture.
     * A lecture is developed if:
     * - Delivery hours > 1, OR
     * - Qualification is COORDINATOR
     */
    private boolean isDevelopedLecture(BigDecimal deliveryHours, TutorQualification qualification) {
        if (deliveryHours == null) {
            return false;
        }
        if (deliveryHours.compareTo(BigDecimal.ONE) > 0) {
            return true;
        }
        return qualification == TutorQualification.COORDINATOR;
    }
}
