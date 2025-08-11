package com.usyd.catams.security;

import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import com.usyd.catams.testing.PostgresTestContainer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for JWT authentication infrastructure.
 * Tests the complete authentication flow with database integration.
 * 
 * @author QA-AuthTest Agent
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers
@Transactional
@DisplayName("JWT Authentication Infrastructure Integration Tests")
public class JwtAuthenticationIntegrationTest {

    @Container
    static PostgresTestContainer postgres = PostgresTestContainer.getInstance();

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Database connection properties
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.flyway.enabled", () -> "false");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private User testUser;
    private String validToken;

    @BeforeEach
    void setUp() {
        // Create and save a test user
        testUser = TestDataBuilder.aLecturer()
                .withId(null) // Let database assign ID
                .withEmail("jwt.test@catams.edu.au")
                .withName("JWT Test User")
                .build();
        
        testUser = userRepository.save(testUser);
        
        // Generate a valid JWT token for the test user
        validToken = jwtTokenProvider.generateToken(
                testUser.getId(),
                testUser.getEmail(),
                testUser.getRole().name()
        );
    }

    @Test
    @DisplayName("Should validate JwtTokenProvider bean is available")
    void shouldHaveJwtTokenProviderBean() {
        // Verify JwtTokenProvider is wired correctly
        org.assertj.core.api.Assertions.assertThat(jwtTokenProvider).isNotNull();
        
        // Test basic functionality
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
        // Test with the valid token for existing user
        mockMvc.perform(get("/api/dashboard")
                .header("Authorization", "Bearer " + validToken))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("Should reject token for non-existent user")
    void shouldRejectTokenForNonExistentUser() throws Exception {
        // Generate token for user that doesn't exist in database
        String tokenForNonExistentUser = jwtTokenProvider.generateToken(
                9999L, "nonexistent@example.com", "ADMIN");

        mockMvc.perform(get("/api/dashboard")
                .header("Authorization", "Bearer " + tokenForNonExistentUser))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should extract correct user information from valid token")
    void shouldExtractUserInfoFromToken() {
        // Test token parsing methods
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
        // Test that we can generate and validate tokens (implies secret is configured)
        String testToken = jwtTokenProvider.generateToken(1L, "test@example.com", UserRole.ADMIN.name());
        
        org.assertj.core.api.Assertions.assertThat(testToken).isNotNull();
        org.assertj.core.api.Assertions.assertThat(jwtTokenProvider.validateToken(testToken)).isTrue();
        
        // Verify token structure (JWT has 3 parts separated by dots)
        org.assertj.core.api.Assertions.assertThat(testToken.split("\\.")).hasSize(3);
    }
}