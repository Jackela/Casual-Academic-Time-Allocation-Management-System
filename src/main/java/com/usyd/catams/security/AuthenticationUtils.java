package com.usyd.catams.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Utility class for extracting authentication information without direct entity dependencies.
 * 
 * This helps maintain clean architecture by providing a centralized way to extract
 * user information from Spring Security authentication context without coupling
 * controllers to domain entities.
 */
@Component
public class AuthenticationUtils {

    /**
     * Extract user ID from authentication context.
     * 
     * Supports multiple authentication principal types:
     * - User entity (legacy support)
     * - Long (direct user ID)
     * - String (parseable user ID)
     * 
     * @param authentication the authentication object
     * @return the user ID
     * @throws SecurityException if authentication is invalid or user ID cannot be extracted
     */
    public Long getCurrentUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new SecurityException("Authentication required");
        }

        Object principal = authentication.getPrincipal();
        
        // Handle User entity (will be removed once refactoring is complete)
        if (principal instanceof com.usyd.catams.entity.User) {
            return ((com.usyd.catams.entity.User) principal).getId();
        } 
        // Handle direct Long ID
        else if (principal instanceof Long) {
            return (Long) principal;
        } 
        // Handle String representation of user ID
        else if (principal instanceof String) {
            try {
                return Long.parseLong((String) principal);
            } catch (NumberFormatException e) {
                throw new SecurityException("Invalid user ID in authentication context: " + principal);
            }
        } 
        // Handle custom UserPrincipal (future enhancement)
        else if (principal.getClass().getSimpleName().equals("UserPrincipal")) {
            // Reflection-based approach to avoid direct dependency
            try {
                return (Long) principal.getClass().getMethod("getUserId").invoke(principal);
            } catch (Exception e) {
                throw new SecurityException("Failed to extract user ID from UserPrincipal");
            }
        }
        else {
            throw new SecurityException("Unsupported authentication principal type: " + principal.getClass().getName());
        }
    }

    /**
     * Check if the current user has a specific role.
     * 
     * @param authentication the authentication object
     * @param role the role to check (e.g., "ROLE_ADMIN", "ADMIN")
     * @return true if the user has the role
     */
    public boolean hasRole(Authentication authentication, String role) {
        if (authentication == null) {
            return false;
        }

        String roleToCheck = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        
        return authentication.getAuthorities().stream()
            .anyMatch(authority -> authority.getAuthority().equals(roleToCheck));
    }

    /**
     * Get the current user's email from authentication context.
     * 
     * @param authentication the authentication object
     * @return the user's email
     * @throws SecurityException if email cannot be extracted
     */
    public String getCurrentUserEmail(Authentication authentication) {
        if (authentication == null) {
            throw new SecurityException("Authentication required");
        }

        // For JWT tokens, the name is typically the email
        String name = authentication.getName();
        if (name != null && name.contains("@")) {
            return name;
        }

        // Fallback to principal if it's a User entity (legacy)
        Object principal = authentication.getPrincipal();
        if (principal instanceof com.usyd.catams.entity.User) {
            return ((com.usyd.catams.entity.User) principal).getEmail();
        }

        throw new SecurityException("Cannot extract email from authentication context");
    }
}