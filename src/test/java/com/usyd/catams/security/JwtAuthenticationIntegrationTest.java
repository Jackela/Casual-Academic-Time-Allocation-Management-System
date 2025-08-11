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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for JWT authentication infrastructure.
 * Tests the complete authentication flow with database integration.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Transactional
@DisplayName("JWT Authentication Infrastructure Integration Tests")
public class JwtAuthenticationIntegrationTest {

    private static final boolean USE_H2 =
            "h2".equalsIgnoreCase(System.getProperty("catams.it.db", System.getenv("IT_DB_ENGINE")));

    private static PostgresTestContainer postgres;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (USE_H2) {
            registry.add("spring.datasource.url", () -> "jdbc:h2:mem:jwt_it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;CASE_INSENSITIVE_IDENTIFIERS=TRUE");
            registry.add("spring.datasource.username", () -> "sa");
            registry.add("spring.datasource.password", () -> "");
            registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
            registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.H2Dialect");
        } else {
            try {
                postgres = PostgresTestContainer.getInstance();
                if (!postgres.isRunning()) {
                    postgres.start();
                }
                registry.add("spring.datasource.url", postgres::getJdbcUrl);
                registry.add("spring.datasource.username", postgres::getUsername);
                registry.add("spring.datasource.password", postgres::getPassword);
                registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
                registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
            } catch (Throwable t) {
                // Fallback to H2 if Docker is not available
                registry.add("spring.datasource.url", () -> "jdbc:h2:mem:jwt_it_fallback;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;CASE_INSENSITIVE_IDENTIFIERS=TRUE");
                registry.add("spring.datasource.username", () -> "sa");
                registry.add("spring.datasource.password", () -> "");
                registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
                registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.H2Dialect");
            }
        }
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
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