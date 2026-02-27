package com.usyd.catams.service.strategy;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.Schedule1PolicyProvider;

/**
 * Strategy interface for calculating task-specific policies.
 * 
 * This interface defines the contract for different calculation strategies
 * based on task type (Tutorial, Lecture, ORAA, Demo, Marking, Other).
 * 
 * Design Principles:
 * - Single Responsibility: Each strategy handles one task type
 * - Open/Closed: New task types can be added without modifying existing code
 * - Strategy Pattern: Encapsulates varying calculation algorithms
 * 
 * @author Development Team
 * @since 1.0
 */
public interface TaskCalculationStrategy {
    
    /**
     * Check if this strategy supports the given task type.
     * 
     * @param taskType the task type to check
     * @return true if this strategy can handle the task type
     */
    boolean supports(TimesheetTaskType taskType);
    
    /**
     * Resolve the rate policy for the given calculation input.
     * 
     * @param input the calculation input containing task details
     * @param policyProvider the policy provider for rate lookups
     * @return the resolved rate policy
     * @throws Schedule1PolicyProvider.RatePolicyNotFoundException if no policy found
     */
    Schedule1PolicyProvider.RatePolicy resolvePolicy(
        Schedule1Calculator.CalculationInput input,
        Schedule1PolicyProvider policyProvider
    ) throws Schedule1PolicyProvider.RatePolicyNotFoundException;
    
    /**
     * Normalize rate code for display purposes.
     * Default implementation returns the raw rate code unchanged.
     * 
     * @param rawRateCode the raw rate code from policy
     * @param input the calculation input
     * @return the normalized rate code for display
     */
    default String normalizeRateCode(String rawRateCode, Schedule1Calculator.CalculationInput input) {
        return rawRateCode;
    }
}
