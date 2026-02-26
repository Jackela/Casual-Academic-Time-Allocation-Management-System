package com.usyd.catams.service.policy;

import com.usyd.catams.service.Schedule1PolicyProvider;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Factory for policy resolution using Chain of Responsibility pattern.
 * 
 * Iterates through resolvers in order and uses the first one that can handle the request.
 * 
 * Design Patterns:
 * - Factory Pattern: Creates/retrieves appropriate resolver
 * - Chain of Responsibility: Ordered list of resolvers
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class PolicyResolverFactory {
    
    private final List<PolicyResolver> resolvers;
    
    /**
     * Constructs factory with ordered list of resolvers.
     * 
     * @param resolvers ordered list of policy resolvers (first match wins)
     */
    public PolicyResolverFactory(List<PolicyResolver> resolvers) {
        this.resolvers = resolvers != null ? List.copyOf(resolvers) : List.of();
    }
    
    /**
     * Resolve policy using chain of resolvers.
     * 
     * @param request the policy request
     * @return the resolved rate policy
     * @throws Schedule1PolicyProvider.RatePolicyNotFoundException if no resolver can find the policy
     */
    public Schedule1PolicyProvider.RatePolicy resolve(PolicyRequest request) 
            throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        
        for (PolicyResolver resolver : resolvers) {
            if (resolver.canResolve(request)) {
                return resolver.resolve(request);
            }
        }
        
        throw new Schedule1PolicyProvider.RatePolicyNotFoundException(
            "No resolver found for rate code: " + request.rateCode());
    }
    
    /**
     * Check if any resolver can handle the request.
     * 
     * @param request the policy request
     * @return true if a resolver is available
     */
    public boolean canResolve(PolicyRequest request) {
        return resolvers.stream().anyMatch(r -> r.canResolve(request));
    }
    
    /**
     * Get the number of registered resolvers.
     * 
     * @return resolver count
     */
    public int getResolverCount() {
        return resolvers.size();
    }
}
