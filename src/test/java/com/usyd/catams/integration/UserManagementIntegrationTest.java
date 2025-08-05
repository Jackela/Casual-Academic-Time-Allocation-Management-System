package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * User Management Integration Test
 * 
 * Tests all Acceptance Criteria for Story 1.1 including:
 * - AC1: User Creation
 * - AC2: Successful Login
 * - AC3: Failed Login
 * - AC4: JWT Content Validation
 * - RBAC: Role-Based Access Control
 * 
 * @author Development Team
 * @since 1.0
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String adminToken;
    private String tutorToken;

    @BeforeEach
    void setUp() {
        // Look up actual user IDs from database for token generation
        Optional<User> adminUser = userRepository.findByEmailAndIsActive("admin@example.com", true);
        Optional<User> tutorUser = userRepository.findByEmailAndIsActive("test@example.com", true); // tutor is "test@example.com"
        
        if (adminUser.isPresent() && tutorUser.isPresent()) {
            adminToken = jwtTokenProvider.generateToken(
                adminUser.get().getId(), 
                adminUser.get().getEmail(), 
                adminUser.get().getRole().name()
            );
            tutorToken = jwtTokenProvider.generateToken(
                tutorUser.get().getId(), 
                tutorUser.get().getEmail(), 
                tutorUser.get().getRole().name()
            );
        } else {
            throw new IllegalStateException("Test users not found in database");
        }
    }

    @Test
    @DisplayName("AC1 - User Creation: Should create new user via POST /users with ADMIN token")
    void shouldCreateNewUserWithAdminToken() throws Exception {
        // Given - Prepare user creation request
        var userCreateRequest = """
            {
                "email": "newuser@example.com",
                "name": "New User",
                "password": "SecurePass123!",
                "role": "TUTOR"
            }
            """;

        // When - Execute user creation request with ADMIN token
        MvcResult result = mockMvc.perform(post("/api/users")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(userCreateRequest))
                .andExpect(status().isCreated())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email", is("newuser@example.com")))
                .andExpect(jsonPath("$.name", is("New User")))
                .andExpect(jsonPath("$.role", is("TUTOR")))
                .andExpect(jsonPath("$.id", notNullValue()))
                .andReturn();

        // Then - Verify user exists in database with BCrypt-hashed password
        Optional<User> savedUser = userRepository.findByEmailAndIsActive("newuser@example.com", true);
        assertTrue(savedUser.isPresent(), "User should be saved in database");
        
        User user = savedUser.get();
        assertEquals("newuser@example.com", user.getEmail());
        assertEquals("New User", user.getName());
        assertEquals(UserRole.TUTOR, user.getRole());
        assertTrue(passwordEncoder.matches("SecurePass123!", user.getHashedPassword()), 
                   "Password should be BCrypt hashed");
        assertNotEquals("SecurePass123!", user.getHashedPassword(), 
                       "Password should not be stored in plain text");
    }

    @Test
    @DisplayName("AC2 - Successful Login: Should login with newly created user credentials")
    void shouldLoginWithNewlyCreatedUser() throws Exception {
        // Given - Create a new user first
        User newUser = new User(
            "testuser@example.com",
            "Test User",
            passwordEncoder.encode("TestPass123!"),
            UserRole.TUTOR
        );
        userRepository.save(newUser);

        var loginRequest = """
            {
                "email": "testuser@example.com",
                "password": "TestPass123!"
            }
            """;

        // When & Then - Execute login and verify JWT is returned
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.token", not(emptyString())))
                .andExpect(jsonPath("$.user", notNullValue()))
                .andExpect(jsonPath("$.user.email", is("testuser@example.com")))
                .andExpect(jsonPath("$.user.role", is("TUTOR")));
    }

    @Test
    @DisplayName("AC3 - Failed Login: Should return 401 for correct email but wrong password")
    void shouldReturnUnauthorizedForWrongPassword() throws Exception {
        // Given - Create a user with known credentials
        User user = new User(
            "failtest@example.com",
            "Fail Test User",
            passwordEncoder.encode("CorrectPass123!"),
            UserRole.TUTOR
        );
        userRepository.save(user);

        var invalidLoginRequest = """
            {
                "email": "failtest@example.com",
                "password": "WrongPassword123!"
            }
            """;

        // When & Then - Execute login with wrong password and verify 401 response
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
    @DisplayName("AC4 - JWT Content: Should contain correct user ID and role information")
    void shouldContainCorrectUserIdAndRoleInJwt() throws Exception {
        // Given - Create a user with specific ID and role
        User user = new User(
            "jwttest@example.com",
            "JWT Test User",
            passwordEncoder.encode("JwtTest123!"),
            UserRole.LECTURER
        );
        User savedUser = userRepository.save(user);

        var loginRequest = """
            {
                "email": "jwttest@example.com",
                "password": "JwtTest123!"
            }
            """;

        // When - Execute login and extract JWT
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", matchesPattern("^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$")))
                .andExpect(jsonPath("$.user.id", is(savedUser.getId().intValue())))
                .andExpect(jsonPath("$.user.role", is("LECTURER")))
                .andReturn();

        // Then - Parse JWT and verify claims
        String responseContent = result.getResponse().getContentAsString();
        JsonNode responseJson = objectMapper.readTree(responseContent);
        String jwtToken = responseJson.get("token").asText();

        // Decode JWT payload (without signature verification for testing)
        String[] chunks = jwtToken.split("\\.");
        Base64.Decoder decoder = Base64.getUrlDecoder();
        String payload = new String(decoder.decode(chunks[1]));
        JsonNode claims = objectMapper.readTree(payload);
        

        // Verify JWT contains correct user ID and role
        assertEquals(savedUser.getId().longValue(), claims.get("userId").asLong(), 
                    "JWT should contain correct user ID");
        assertEquals("LECTURER", claims.get("role").asText(), 
                    "JWT should contain correct role");
        assertEquals("jwttest@example.com", claims.get("sub").asText(), 
                    "JWT should contain correct email as subject");
    }

    @Test
    @DisplayName("RBAC - POST /users should return 403 Forbidden for non-ADMIN users")
    void shouldForbidUserCreationForNonAdminUsers() throws Exception {
        // Given - Prepare user creation request
        var userCreateRequest = """
            {
                "email": "unauthorized@example.com",
                "name": "Unauthorized User",
                "password": "UnauthorizedPass123!",
                "role": "TUTOR"
            }
            """;

        // When & Then - Execute user creation request with TUTOR token and verify 403 response
        mockMvc.perform(post("/api/users")
                .header("Authorization", "Bearer " + tutorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(userCreateRequest))
                .andExpect(status().isForbidden());

        // Verify user was NOT created in database
        Optional<User> user = userRepository.findByEmailAndIsActive("unauthorized@example.com", true);
        assertFalse(user.isPresent(), "User should NOT be created by non-ADMIN user");
    }

    @Test
    @DisplayName("RBAC - POST /users should return 401 Unauthorized without token")
    void shouldRequireAuthenticationForUserCreation() throws Exception {
        // Given - Prepare user creation request
        var userCreateRequest = """
            {
                "email": "noauth@example.com",
                "name": "No Auth User",
                "password": "NoAuthPass123!",
                "role": "TUTOR"
            }
            """;

        // When & Then - Execute user creation request without token and verify 401 response
        // Note: Spring Security returns 401 (Unauthorized) for unauthenticated requests
        // as configured in SecurityConfig with HttpStatusEntryPoint
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(userCreateRequest))
                .andExpect(status().isUnauthorized());

        // Verify user was NOT created in database
        Optional<User> user = userRepository.findByEmailAndIsActive("noauth@example.com", true);
        assertFalse(user.isPresent(), "User should NOT be created without authentication");
    }
}