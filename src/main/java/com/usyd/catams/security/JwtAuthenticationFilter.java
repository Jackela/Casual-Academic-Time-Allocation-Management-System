package com.usyd.catams.security;

import com.usyd.catams.entity.User;
import com.usyd.catams.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

/**
 * JWT Authentication Filter
 * 
 * Processes incoming HTTP requests to extract and validate JWT tokens,
 * setting up the security context for authenticated users
 * 
 * @author Development Team
 * @since 1.0
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String AUTHORIZATION_HEADER = "Authorization";
    
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    
    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        try {
            String authHeader = request.getHeader(AUTHORIZATION_HEADER);
            String token = jwtTokenProvider.extractTokenFromHeader(authHeader);
            
            if (token != null && jwtTokenProvider.validateToken(token)) {
                authenticateUser(token, request);
            }
        } catch (Exception e) {
            logger.warn("JWT authentication failed: {}", e.getMessage());
            // Clear security context on any authentication error
            SecurityContextHolder.clearContext();
        }
        
        filterChain.doFilter(request, response);
    }
    
    /**
     * Authenticate user based on valid JWT token
     * 
     * @param token Valid JWT token
     * @param request HTTP request for authentication details
     */
    private void authenticateUser(String token, HttpServletRequest request) {
        String userEmail = jwtTokenProvider.getUserEmailFromToken(token);
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        String role = jwtTokenProvider.getUserRoleFromToken(token);
        
        if (userEmail != null && userId != null && role != null && 
            SecurityContextHolder.getContext().getAuthentication() == null) {
            
            // Verify user still exists and is active
            Optional<User> userOpt = userRepository.findByEmailAndIsActive(userEmail, true);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                
                // Verify token claims match database record
                if (user.getId().equals(userId) && user.getRole().name().equals(role)) {
                    
                    // Create authentication with user details and role
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role);
                    UsernamePasswordAuthenticationToken authentication = 
                        new UsernamePasswordAuthenticationToken(
                            user, 
                            null, 
                            Collections.singletonList(authority)
                        );
                    
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    logger.debug("JWT authentication successful for user: {} with role: {}", userEmail, role);
                } else {
                    logger.warn("JWT token claims mismatch with database record for user: {}", userEmail);
                }
            } else {
                logger.warn("User not found or inactive for JWT token: {}", userEmail);
            }
        }
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        
        // Skip JWT filter for public endpoints
        return path.equals("/api/auth/login") ||
               path.equals("/auth/login") ||
               path.equals("/api/test-data/reset") ||
               path.equals("/actuator/health") ||
               path.startsWith("/actuator/health/");
    }
}


