package com.usyd.catams.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

/**
 * Authentication entry point that returns RFC 7807 Problem Details responses
 * with the {@code application/problem+json} content type for 401 errors.
 * Keeps error fields aligned with the rest of the API error format.
 */
@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

        String traceId = request.getHeader("X-Request-Id");
        if (traceId == null || traceId.isBlank()) traceId = java.util.UUID.randomUUID().toString();

        // Serialize a Problem Details shaped JSON with top-level custom fields
        var body = new java.util.LinkedHashMap<String, Object>();
        body.put("type", "about:blank");
        body.put("title", HttpStatus.UNAUTHORIZED.getReasonPhrase());
        body.put("status", 401);
        body.put("detail", "Authentication required");
        body.put("instance", request.getRequestURI());
        // Custom fields expected by tests/clients
        body.put("success", false);
        body.put("timestamp", Instant.now().toString());
        body.put("error", "Unauthorized");
        body.put("message", "Authentication required");
        body.put("path", request.getRequestURI());
        body.put("traceId", traceId);

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
