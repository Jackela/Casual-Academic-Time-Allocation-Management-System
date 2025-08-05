package com.usyd.catams.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.dto.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

/**
 * Custom authentication entry point that returns JSON error responses
 * instead of plain HTTP status codes.
 * 
 * This ensures consistent API response format for authentication failures,
 * which is required for proper contract testing and API compliance.
 */
@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                        AuthenticationException authException) throws IOException {
        
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(Instant.now().toString())
            .status(401)
            .error("Unauthorized")
            .message("Authentication required")
            .errorMessage("Authentication required")
            .path(request.getRequestURI())
            .build();
        
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}