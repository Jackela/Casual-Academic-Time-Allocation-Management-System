package com.usyd.catams.security;

import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for JWT authentication infrastructure.
 * Tests the complete authentication flow with database integration.
 */
@DisplayName("JWT Authentication Infrastructure Integration Tests")
public class JwtAuthenticationIntegrationTest extends IntegrationTestBase {

    private User testUser;
    private String validToken;

    @BeforeEach
    void setUp() {
        testUser = TestDataBuilder.aLecturer()
                .withId(null)
                .withEmail("jwt.test@catams.edu.au")
                .withName("JWT Test User")
                .build();
        testUser = userRepository.save(testUser);
        validToken = jwtTokenProvider.generateToken(
                testUser.getId(),
                testUser.getEmail(),
                testUser.getRole().name()
        );
    }

    @Test
    @DisplayName("Should validate JwtTokenProvider bean is available")
    void shouldHaveJwtTokenProviderBean() {
        org.assertj.core.api.Assertions.assertThat(jwtTokenProvider).isNotNull();
        String token = jwtTokenProvider.generateToken(1L, "test@example.com", "ADMIN");
        org.assertj.core.api.Assertions.assertThat(token).isNotNull().isNotEmpty();
        org.assertj.core.api.Assertions.assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("Should reject requests without authentication")
    void shouldRejectUnauthenticatedRequests() throws Exception {
        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should reject requests with invalid token")
    void shouldRejectInvalidToken() throws Exception {
        mockMvc.perform(get("/api/dashboard")
                .header("Authorization", "Bearer invalid.token.here"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should accept requests with valid JWT token")
    void shouldAcceptValidToken() throws Exception {
        mockMvc.perform(get("/api/dashboard")
                .header("Authorization", "Bearer " + validToken))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("Should reject token for non-existent user")
    void shouldRejectTokenForNonExistentUser() throws Exception {
        String tokenForNonExistentUser = jwtTokenProvider.generateToken(
                9999L, "nonexistent@example.com", "ADMIN");
        mockMvc.perform(get("/api/dashboard")
                .header("Authorization", "Bearer " + tokenForNonExistentUser))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should extract correct user information from valid token")
    void shouldExtractUserInfoFromToken() {
        org.assertj.core.api.Assertions.assertThat(
                jwtTokenProvider.getUserEmailFromToken(validToken)
        ).isEqualTo(testUser.getEmail());
        org.assertj.core.api.Assertions.assertThat(
                jwtTokenProvider.getUserIdFromToken(validToken)
        ).isEqualTo(testUser.getId());
        org.assertj.core.api.Assertions.assertThat(
                jwtTokenProvider.getUserRoleFromToken(validToken)
        ).isEqualTo(testUser.getRole().name());
    }

    @Test
    @DisplayName("Should validate JWT secret configuration")
    void shouldHaveProperJwtConfiguration() {
        String testToken = jwtTokenProvider.generateToken(1L, "test@example.com", UserRole.ADMIN.name());
        org.assertj.core.api.Assertions.assertThat(testToken).isNotNull();
        org.assertj.core.api.Assertions.assertThat(jwtTokenProvider.validateToken(testToken)).isTrue();
        org.assertj.core.api.Assertions.assertThat(testToken.split("\\.")).hasSize(3);
    }
}
