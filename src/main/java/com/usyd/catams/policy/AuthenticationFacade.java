package com.usyd.catams.policy;

/**
 * Abstraction over authentication context to decouple web layer
 * from concrete security implementation details.
 * DbC: Implementations must return a non-null user id for authenticated requests
 * and throw an IllegalStateException otherwise.
 */
public interface AuthenticationFacade {

    /**
     * Obtain the current authenticated user id.
     * @return current user id
     * @throws IllegalStateException when no authentication is present
     */
    Long getCurrentUserId();

    /**
     * Obtain the roles (authorities) of the current authenticated user.
     * @return collection of role strings (e.g. ROLE_ADMIN)
     * @throws IllegalStateException when no authentication is present
     */
    java.util.Collection<String> getCurrentUserRoles();
}
