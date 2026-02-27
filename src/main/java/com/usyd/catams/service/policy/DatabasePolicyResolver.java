package com.usyd.catams.service.policy;

import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

/**
 * Resolver that looks up policies from database via Schedule1PolicyProvider.
 * 
 * This is the primary resolver that should be tried first.
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class DatabasePolicyResolver implements PolicyResolver {
    
    private final Schedule1PolicyProvider policyProvider;
    
    public DatabasePolicyResolver(Schedule1PolicyProvider policyProvider) {
        this.policyProvider = policyProvider;
    }
    
    @Override
    public boolean canResolve(PolicyRequest request) {
        // Always try database first
        return true;
    }
    
    @Override
    public Schedule1PolicyProvider.RatePolicy resolve(PolicyRequest request) 
            throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        return policyProvider.resolvePolicyByRateCode(
            request.rateCode(),
            request.qualification(),
            request.sessionDate()
        );
    }
}
