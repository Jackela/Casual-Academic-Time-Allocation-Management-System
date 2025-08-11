package com.usyd.catams.integration;

import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testutil.TestAuthenticationHelper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for JWT authentication infrastructure.
 * 
 * This test class validates:
 * - JWT token provider functionality
 * - TestAuthenticationHelper methods  
 * - Security filter chain configuration
 * - Role-based access control
 * - Authentication error handling
 * 
 * @author QA-AuthTest Agent
 */
@DisplayName("JWT Authentication Integration Tests")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class AuthenticationIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private TestUserSeedingService testUserSeedingService;

    @BeforeAll
    void setUpAuthenticationTest() {
        // Seed users required for JWT authentication testing in separate transaction
        // This runs once for all tests in the class to avoid test isolation issues
        testUserSeedingService.seedTestUsers();
    }

    @Test
    @DisplayName("Should reject unauthenticated requests")
    void shouldRejectUnauthenticatedRequests() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType("application/json"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorMessage").exists());
    }

    @Test
    @DisplayName("Should reject requests with invalid JWT tokens")
    void shouldRejectInvalidTokens() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .with(TestAuthenticationHelper.withInvalidToken()))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType("application/json"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorMessage").exists());
    }

    @Test
    @DisplayName("Should accept valid admin JWT tokens")
    void shouldAcceptValidAdminTokens() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .with(TestAuthenticationHelper.asAdmin(jwtTokenProvider)))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("Should accept valid lecturer JWT tokens")
    void shouldAcceptValidLecturerTokens() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .with(TestAuthenticationHelper.asLecturer(1L, jwtTokenProvider)))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("Should accept valid tutor JWT tokens")
    void shouldAcceptValidTutorTokens() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .with(TestAuthenticationHelper.asTutor(1L, jwtTokenProvider)))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @DisplayName("Should validate JWT token provider bean availability")
    void shouldHaveJwtTokenProviderBean() throws Exception {
        // Verify JwtTokenProvider is available in test context
        assertThat(jwtTokenProvider).isNotNull();
        
        // Test token generation
        String token = jwtTokenProvider.generateToken(1L, "test@example.com", "ADMIN");
        assertThat(token).isNotNull().isNotEmpty();
        
        // Test token validation
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        
        // Test token parsing
        assertThat(jwtTokenProvider.getUserEmailFromToken(token)).isEqualTo("test@example.com");
        assertThat(jwtTokenProvider.getUserIdFromToken(token)).isEqualTo(1L);
        assertThat(jwtTokenProvider.getUserRoleFromToken(token)).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("Should generate proper Bearer tokens with TestAuthenticationHelper")
    void shouldGenerateBearerTokens() throws Exception {
        String bearerToken = TestAuthenticationHelper.generateBearerToken(
                1L, "test@example.com", UserRole.ADMIN, jwtTokenProvider);
        
        assertThat(bearerToken).startsWith("Bearer ");
        
        String token = bearerToken.substring(7); // Remove "Bearer " prefix
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
    }
    
    @Test
    @DisplayName("Should verify seeded users exist in database")
    void shouldVerifySeededUsersExist() throws Exception {
        // Check if seeded users are actually persisted and findable
        var adminOptional = userRepository.findByEmailAndIsActive("admin@integration.test", true);
        assertThat(adminOptional).isPresent();
        
        var lecturerOptional = userRepository.findByEmailAndIsActive("lecturer1@integration.test", true);
        assertThat(lecturerOptional).isPresent();
        
        var tutorOptional = userRepository.findByEmailAndIsActive("tutor1@integration.test", true);
        assertThat(tutorOptional).isPresent();
    }
}