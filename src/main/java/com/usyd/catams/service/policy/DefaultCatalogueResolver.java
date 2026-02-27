package com.usyd.catams.service.policy;

import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

/**
 * Fallback resolver that provides default catalogue values.
 * 
 * Used when database lookup fails, providing hardcoded defaults.
 * This resolver delegates to Schedule1PolicyProvider's default catalogue.
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class DefaultCatalogueResolver implements PolicyResolver {
    
    private final Schedule1PolicyProvider policyProvider;
    
    public DefaultCatalogueResolver(Schedule1PolicyProvider policyProvider) {
        this.policyProvider = policyProvider;
    }
    
    @Override
    public boolean canResolve(PolicyRequest request) {
        // Can attempt to resolve any rate code using default catalogue
        String rateCode = request.rateCode();
        return rateCode != null && !rateCode.isBlank();
    }
    
    @Override
    public Schedule1PolicyProvider.RatePolicy resolve(PolicyRequest request) 
            throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        
        // Delegate to policy provider's default catalogue
        // The policy provider already has fallback logic
        return policyProvider.resolvePolicyByRateCode(
            request.rateCode(),
            request.qualification(),
            request.sessionDate()
        );
    }
}
