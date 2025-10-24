package com.usyd.catams.policy.impl;

import com.usyd.catams.policy.AuthenticationFacade;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Spring Security implementation of AuthenticationFacade.
 */
@Component
public class SpringSecurityAuthenticationFacade implements AuthenticationFacade {

    @Override
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new IllegalStateException("No authentication present");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof com.usyd.catams.entity.User u) {
            return u.getId();
        }
        if (principal instanceof Long l) {
            return l;
        }
        if (principal instanceof String s) {
            try { return Long.parseLong(s); } catch (NumberFormatException e) { /* fallthrough */ }
        }
        throw new IllegalStateException("Unsupported principal type: " + principal.getClass().getName());
    }

    @Override
    public java.util.Collection<String> getCurrentUserRoles() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new IllegalStateException("No authentication present");
        }
        java.util.List<String> roles = new java.util.ArrayList<>();
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            roles.add(authority.getAuthority());
        }
        return roles;
    }
}
