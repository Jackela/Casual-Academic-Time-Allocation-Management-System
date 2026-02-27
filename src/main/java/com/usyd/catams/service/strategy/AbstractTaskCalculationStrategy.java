package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1Calculator;

/**
 * Abstract base class for task calculation strategies.
 * 
 * Provides common utility methods shared across all strategies:
 * - Qualification normalization
 * - High band detection
 * - High band qualification resolution
 * 
 * @author Development Team
 * @since 1.0
 */
public abstract class AbstractTaskCalculationStrategy implements TaskCalculationStrategy {
    
    /**
     * Normalize qualification, defaulting to STANDARD if null.
     * 
     * @param qualification the qualification to normalize
     * @return normalized qualification (never null)
     */
    protected TutorQualification normaliseQualification(TutorQualification qualification) {
        return qualification == null ? TutorQualification.STANDARD : qualification;
    }
    
    /**
     * Check if qualification is in high band (PHD or COORDINATOR).
     * 
     * @param qualification the qualification to check
     * @return true if high band
     */
    protected boolean isHighBand(TutorQualification qualification) {
        TutorQualification normalised = normaliseQualification(qualification);
        return normalised == TutorQualification.PHD || normalised == TutorQualification.COORDINATOR;
    }
    
    /**
     * Resolve the policy qualification for high band.
     * COORDINATOR stays as COORDINATOR, others become PHD.
     * 
     * @param qualification the original qualification
     * @return the policy qualification for high band
     */
    protected TutorQualification resolveHighBandQualification(TutorQualification qualification) {
        return qualification == TutorQualification.COORDINATOR 
            ? TutorQualification.COORDINATOR 
            : TutorQualification.PHD;
    }
    
    /**
     * Get the fallback qualification for tutorial policies.
     * When COORDINATOR lookup fails, fallback to PHD.
     * 
     * @param policyQualification the policy qualification that failed
     * @param originalQualification the original user qualification
     * @return the fallback qualification, or null if no fallback needed
     */
    protected TutorQualification getFallbackQualification(
            TutorQualification policyQualification, 
            TutorQualification originalQualification) {
        if (policyQualification == TutorQualification.COORDINATOR 
                && originalQualification == TutorQualification.COORDINATOR) {
            return TutorQualification.PHD;
        }
        return null;
    }
}
