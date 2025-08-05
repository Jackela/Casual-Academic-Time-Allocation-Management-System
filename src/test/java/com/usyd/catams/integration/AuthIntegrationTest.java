package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Authentication API integration test
 * 
 * Tests user authentication related API endpoints including login functionality
 * 
 * @author Development Team
 * @since 1.0
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Successful login should return JWT Token")
    void shouldReturnJwtTokenOnSuccessfulLogin() throws Exception {
        // Given - Prepare login request data
        var loginRequest = """
            {
                "email": "test@example.com",
                "password": "Password123!"
            }
            """;

        // When & Then - Execute login request and verify response
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.token", not(emptyString())))
                .andExpect(jsonPath("$.user", notNullValue()))
                .andExpect(jsonPath("$.user.email", is("test@example.com")))
                .andExpect(jsonPath("$.user.role", notNullValue()));
    }

    @Test
    @DisplayName("Invalid credentials should return authentication failure")
    void shouldReturnAuthenticationFailureOnInvalidCredentials() throws Exception {
        // Given - Prepare invalid login request data
        var invalidLoginRequest = """
            {
                "email": "test@example.com",
                "password": "wrongpassword"
            }
            """;

        // When & Then - Execute login request and verify failure response (standardized error format)
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidLoginRequest))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("AUTH_FAILED")))
                .andExpect(jsonPath("$.message", is("Authentication failed")))
                .andExpect(jsonPath("$.path", is("/api/auth/login")));
    }

    @Test
    @DisplayName("Invalid request format should return 400 error")
    void shouldReturnBadRequestOnInvalidRequestFormat() throws Exception {
        // Given - Prepare invalid request format
        var invalidRequest = """
            {
                "email": "invalid-email",
                "password": ""
            }
            """;

        // When & Then - Execute request and verify 400 error (standardized error format)
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.message", containsString("Validation failed")))
                .andExpect(jsonPath("$.path", is("/api/auth/login")));
    }

    @Test
    @DisplayName("JWT Token should contain user ID and role information")
    void shouldIncludeUserIdAndRoleInJwtToken() throws Exception {
        // Given - Prepare login request data
        var loginRequest = """
            {
                "email": "lecturer@example.com",
                "password": "Password123!"
            }
            """;

        // When & Then - Execute login and verify JWT content
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", matchesPattern("^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$")))
                .andExpect(jsonPath("$.user.id", notNullValue()))
                .andExpect(jsonPath("$.user.role", is("LECTURER")));
    }
}