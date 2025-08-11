package com.usyd.catams.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for JwtTokenProvider.
 * 
 * Tests JWT token generation, validation, and parsing functionality
 * without requiring full Spring context.
 * 
 * @author QA-AuthTest Agent
 */
@DisplayName("JWT Token Provider Unit Tests")
public class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    
    @BeforeEach
    void setUp() {
        // Use Base64 encoded test secret (same as in application-integration-test.yml)
        String testSecret = "dGVzdC1zZWNyZXQtZm9yLWludGVncmF0aW9uLXRlc3RzLW11c3QtYmUtYXQtbGVhc3QtMjU2LWJpdHM=";
        long validityInMilliseconds = 3600000; // 1 hour
        
        jwtTokenProvider = new JwtTokenProvider(testSecret, validityInMilliseconds);
    }
    
    @Test
    @DisplayName("Should generate valid JWT tokens")
    void shouldGenerateValidTokens() {
        // Given
        Long userId = 1L;
        String email = "test@example.com";
        String role = "ADMIN";
        
        // When
        String token = jwtTokenProvider.generateToken(userId, email, role);
        
        // Then
        assertThat(token).isNotNull().isNotEmpty();
        assertThat(token.split("\\.")).hasSize(3); // JWT has 3 parts: header.payload.signature
    }
    
    @Test
    @DisplayName("Should validate generated tokens")
    void shouldValidateGeneratedTokens() {
        // Given
        String token = jwtTokenProvider.generateToken(1L, "test@example.com", "ADMIN");
        
        // When & Then
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }
    
    @Test
    @DisplayName("Should reject invalid tokens")
    void shouldRejectInvalidTokens() {
        // Test various invalid token formats
        assertThat(jwtTokenProvider.validateToken("invalid.token.here")).isFalse();
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
        assertThat(jwtTokenProvider.validateToken(null)).isFalse();
        assertThat(jwtTokenProvider.validateToken("not-a-jwt-token")).isFalse();
    }
    
    @Test
    @DisplayName("Should extract user email from token")
    void shouldExtractUserEmailFromToken() {
        // Given
        String email = "test@example.com";
        String token = jwtTokenProvider.generateToken(1L, email, "ADMIN");
        
        // When
        String extractedEmail = jwtTokenProvider.getUserEmailFromToken(token);
        
        // Then
        assertThat(extractedEmail).isEqualTo(email);
    }
    
    @Test
    @DisplayName("Should extract user ID from token")
    void shouldExtractUserIdFromToken() {
        // Given
        Long userId = 123L;
        String token = jwtTokenProvider.generateToken(userId, "test@example.com", "LECTURER");
        
        // When
        Long extractedUserId = jwtTokenProvider.getUserIdFromToken(token);
        
        // Then
        assertThat(extractedUserId).isEqualTo(userId);
    }
    
    @Test
    @DisplayName("Should extract user role from token")
    void shouldExtractUserRoleFromToken() {
        // Given
        String role = "TUTOR";
        String token = jwtTokenProvider.generateToken(1L, "test@example.com", role);
        
        // When
        String extractedRole = jwtTokenProvider.getUserRoleFromToken(token);
        
        // Then
        assertThat(extractedRole).isEqualTo(role);
    }
    
    @Test
    @DisplayName("Should extract token from Authorization header")
    void shouldExtractTokenFromAuthorizationHeader() {
        // Given
        String token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
        String authHeader = "Bearer " + token;
        
        // When
        String extractedToken = jwtTokenProvider.extractTokenFromHeader(authHeader);
        
        // Then
        assertThat(extractedToken).isEqualTo(token);
    }
    
    @Test
    @DisplayName("Should return null for invalid Authorization headers")
    void shouldReturnNullForInvalidAuthHeaders() {
        assertThat(jwtTokenProvider.extractTokenFromHeader(null)).isNull();
        assertThat(jwtTokenProvider.extractTokenFromHeader("")).isNull();
        assertThat(jwtTokenProvider.extractTokenFromHeader("InvalidHeader")).isNull();
        assertThat(jwtTokenProvider.extractTokenFromHeader("Basic dGVzdA==")).isNull();
    }
    
    @Test
    @DisplayName("Should return null for claims from invalid tokens")
    void shouldReturnNullForInvalidTokenClaims() {
        assertThat(jwtTokenProvider.getUserEmailFromToken("invalid.token")).isNull();
        assertThat(jwtTokenProvider.getUserIdFromToken("invalid.token")).isNull();
        assertThat(jwtTokenProvider.getUserRoleFromToken("invalid.token")).isNull();
        assertThat(jwtTokenProvider.getClaimsFromToken("invalid.token")).isNull();
    }
}