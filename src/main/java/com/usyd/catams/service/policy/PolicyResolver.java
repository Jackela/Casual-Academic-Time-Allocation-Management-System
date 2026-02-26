package com.usyd.catams.service.policy;

import com.usyd.catams.service.Schedule1PolicyProvider;

/**
 * Strategy interface for policy resolution.
 * 
 * Different implementations can resolve policies from different sources:
 * - Database (primary)
 * - In-memory cache
 * - Default catalogue (fallback)
 * 
 * @author Development Team
 * @since 1.0
 */
public interface PolicyResolver {
    
    /**
     * Check if this resolver can handle the given request.
     * 
     * @param request the policy request
     * @return true if this resolver can resolve the policy
     */
    boolean canResolve(PolicyRequest request);
    
    /**
     * Resolve the rate policy for the given request.
     * 
     * @param request the policy request
     * @return the resolved rate policy
     * @throws Schedule1PolicyProvider.RatePolicyNotFoundException if policy not found
     */
    Schedule1PolicyProvider.RatePolicy resolve(PolicyRequest request) 
        throws Schedule1PolicyProvider.RatePolicyNotFoundException;
}
