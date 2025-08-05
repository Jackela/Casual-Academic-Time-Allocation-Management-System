package com.usyd.catams.contract.api;

import com.usyd.catams.contract.ApiTestBase;
import com.usyd.catams.dto.request.AuthenticationRequest;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * API Contract Tests for Authentication endpoints.
 * 
 * These tests focus on HTTP API compliance with OpenAPI specification:
 * - Request/response schema validation
 * - HTTP status codes compliance
 * - Content-Type headers
 * - Authentication flows
 * 
 * Does NOT test implementation details or business logic.
 */
@DisplayName("Auth API Contract Tests")
class AuthApiContractTest extends ApiTestBase {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setupTestUser() {
        // Create test user for authentication contract tests
        User testUser = new User();
        testUser.setEmail("contract.test@university.edu");
        testUser.setHashedPassword(passwordEncoder.encode("SecurePassword123"));
        testUser.setName("Contract Test User");
        testUser.setRole(UserRole.LECTURER);
        userRepository.save(testUser);
    }

    @Test
    @DisplayName("POST /api/auth/login - Valid credentials should return JWT token")
    void loginWithValidCredentials_ShouldReturnJwtToken() throws Exception {
        // Arrange
        AuthenticationRequest request = testAuthRequest()
            .email("contract.test@university.edu")
            .password("SecurePassword123")
            .build();

        // Act & Assert
        performPost("/api/auth/login", request)
            .andExpect(status().isOk())
            .andExpect(content().contentType("application/json"))
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.token").exists())
            .andExpect(jsonPath("$.token").isString())
            .andExpect(jsonPath("$.user").exists())
            .andExpect(jsonPath("$.user.id").exists())
            .andExpect(jsonPath("$.user.email").value("contract.test@university.edu"))
            .andExpect(jsonPath("$.user.name").value("Contract Test User"))
            .andExpect(jsonPath("$.user.role").value("LECTURER"))
            .andExpect(jsonPath("$.errorMessage").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/auth/login - Invalid credentials should return 401")
    void loginWithInvalidCredentials_ShouldReturn401() throws Exception {
        // Arrange
        AuthenticationRequest request = testAuthRequest()
            .email("contract.test@university.edu")
            .password("WrongPassword")
            .build();

        // Act & Assert
        performPost("/api/auth/login", request)
            .andExpect(status().isUnauthorized())
            .andExpect(content().contentType("application/json"))
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.token").doesNotExist())
            .andExpect(jsonPath("$.user").doesNotExist())
            .andExpect(jsonPath("$.errorMessage").exists())
            .andExpect(jsonPath("$.errorMessage").isString());
    }

    @Test
    @DisplayName("POST /api/auth/login - Invalid email format should return 400")
    void loginWithInvalidEmailFormat_ShouldReturn400() throws Exception {
        // Arrange
        AuthenticationRequest request = testAuthRequest()
            .email("invalid-email-format")
            .password("SecurePassword123")
            .build();

        // Act & Assert
        performPost("/api/auth/login", request)
            .andExpect(status().isBadRequest())
            .andExpect(content().contentType("application/json"))
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.token").doesNotExist())
            .andExpect(jsonPath("$.user").doesNotExist())
            .andExpect(jsonPath("$.errorMessage").exists())
            .andExpect(jsonPath("$.errorMessage").value(org.hamcrest.Matchers.containsString("Email format is invalid")));
    }

    @Test
    @DisplayName("POST /api/auth/login - Empty password should return 400")
    void loginWithEmptyPassword_ShouldReturn400() throws Exception {
        // Arrange
        AuthenticationRequest request = testAuthRequest()
            .email("contract.test@university.edu")
            .password("")
            .build();

        // Act & Assert
        performPost("/api/auth/login", request)
            .andExpect(status().isBadRequest())
            .andExpect(content().contentType("application/json"))
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.token").doesNotExist())
            .andExpect(jsonPath("$.user").doesNotExist())
            .andExpect(jsonPath("$.errorMessage").exists())
            .andExpect(jsonPath("$.errorMessage").value(org.hamcrest.Matchers.containsString("Password cannot be empty")));
    }

    @Test
    @DisplayName("POST /api/auth/login - Missing request body should return 400")
    void loginWithMissingBody_ShouldReturn400() throws Exception {
        // Act & Assert
        performPost("/api/auth/login", null)
            .andExpect(status().isBadRequest())
            .andExpect(content().contentType("application/json"));
    }

    @Test
    @DisplayName("POST /api/auth/login - Response should match OpenAPI schema")
    void loginResponse_ShouldMatchOpenApiSchema() throws Exception {
        // Arrange
        AuthenticationRequest request = testAuthRequest()
            .email("contract.test@university.edu")
            .password("SecurePassword123")
            .build();

        // Act & Assert - OpenAPI validation is automatically applied in ApiTestBase
        assertValidApiResponse(
            performPost("/api/auth/login", request)
        );
    }

    @Test
    @DisplayName("POST /api/auth/login - Should accept correct Content-Type")
    void loginRequest_ShouldAcceptJsonContentType() throws Exception {
        // Arrange
        AuthenticationRequest request = testAuthRequest()
            .email("contract.test@university.edu")
            .password("SecurePassword123")
            .build();

        // Act & Assert
        performPost("/api/auth/login", request)
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("application/json")));
    }
}