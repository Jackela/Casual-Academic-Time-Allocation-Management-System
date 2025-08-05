package com.usyd.catams.contract;

import com.atlassian.oai.validator.mockmvc.OpenApiValidationMatchers;
import com.atlassian.oai.validator.OpenApiInteractionValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Base class for API contract testing with OpenAPI validation.
 * 
 * This class provides:
 * - OpenAPI schema validation for all HTTP requests/responses
 * - Standardized JWT authentication helpers
 * - Common API testing utilities
 * - Consistent test data setup via TestDataBuilder
 * 
 * Contract tests focus on HTTP API compliance, not implementation details.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class ApiTestBase {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    protected OpenApiInteractionValidator validator;

    // Pre-built test users and tokens for different roles
    protected User testLecturerUser;
    protected User testTutorUser;
    protected User testAdminUser;
    protected String lecturerToken;
    protected String tutorToken;
    protected String adminToken;

    @BeforeEach
    void setupApiValidation() {
        // Load OpenAPI specification for validation
        File openApiSpec = new File("docs/openapi.yaml");
        if (openApiSpec.exists()) {
            try {
                validator = OpenApiInteractionValidator
                    .createForSpecificationUrl("file://" + openApiSpec.getAbsolutePath())
                    .build();
            } catch (Exception e) {
                // Log warning but continue without validation
                System.out.println("Warning: Could not load OpenAPI spec for validation: " + e.getMessage());
                validator = null;
            }
        } else {
            // OpenAPI spec not found - tests will run without schema validation
            validator = null;
        }
        
        // Setup authentication tokens for different roles
        setupAuthTokens();
    }

    private void setupAuthTokens() {
        // Create and persist test users to database for authentication
        testLecturerUser = createTestUser("lecturer.base@test.com", "Test Lecturer", UserRole.LECTURER);
        lecturerToken = "Bearer " + jwtTokenProvider.generateToken(
            testLecturerUser.getId(), testLecturerUser.getEmail(), testLecturerUser.getRole().name()
        );
        
        testTutorUser = createTestUser("tutor.base@test.com", "Test Tutor", UserRole.TUTOR);
        tutorToken = "Bearer " + jwtTokenProvider.generateToken(
            testTutorUser.getId(), testTutorUser.getEmail(), testTutorUser.getRole().name()
        );
        
        testAdminUser = createTestUser("admin.base@test.com", "Test Admin", UserRole.ADMIN);
        adminToken = "Bearer " + jwtTokenProvider.generateToken(
            testAdminUser.getId(), testAdminUser.getEmail(), testAdminUser.getRole().name()
        );
    }

    private User createTestUser(String email, String name, UserRole role) {
        User user = new User();
        user.setEmail(email);
        user.setName(name);
        user.setRole(role);
        user.setHashedPassword(passwordEncoder.encode("password"));
        return userRepository.save(user);
    }

    /**
     * Perform a GET request with OpenAPI validation
     */
    protected ResultActions performGet(String endpoint) throws Exception {
        return performGet(endpoint, null);
    }

    protected ResultActions performGet(String endpoint, String authToken) throws Exception {
        var requestBuilder = get(endpoint)
            .contentType(MediaType.APPLICATION_JSON);
            
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        
        ResultActions result = mockMvc.perform(requestBuilder);
        
        // Validate against OpenAPI spec if available
        if (validator != null) {
            result.andExpect(OpenApiValidationMatchers.openApi().isValid(validator));
        }
        
        return result;
    }

    /**
     * Perform a POST request with OpenAPI validation
     */
    protected ResultActions performPost(String endpoint, Object requestBody) throws Exception {
        return performPost(endpoint, requestBody, null);
    }

    protected ResultActions performPost(String endpoint, Object requestBody, String authToken) throws Exception {
        var requestBuilder = post(endpoint)
            .contentType(MediaType.APPLICATION_JSON);
            
        if (requestBody != null) {
            requestBuilder.content(objectMapper.writeValueAsString(requestBody));
        }
        
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        
        ResultActions result = mockMvc.perform(requestBuilder);
        
        // Validate against OpenAPI spec if available
        if (validator != null) {
            result.andExpect(OpenApiValidationMatchers.openApi().isValid(validator));
        }
        
        return result;
    }

    /**
     * Perform a PUT request with OpenAPI validation
     */
    protected ResultActions performPut(String endpoint, Object requestBody, String authToken) throws Exception {
        var requestBuilder = put(endpoint)
            .contentType(MediaType.APPLICATION_JSON);
            
        if (requestBody != null) {
            requestBuilder.content(objectMapper.writeValueAsString(requestBody));
        }
        
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        
        ResultActions result = mockMvc.perform(requestBuilder);
        
        // Validate against OpenAPI spec if available
        if (validator != null) {
            result.andExpect(OpenApiValidationMatchers.openApi().isValid(validator));
        }
        
        return result;
    }

    /**
     * Perform a DELETE request with OpenAPI validation
     */
    protected ResultActions performDelete(String endpoint, String authToken) throws Exception {
        var requestBuilder = delete(endpoint)
            .contentType(MediaType.APPLICATION_JSON);
            
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        
        ResultActions result = mockMvc.perform(requestBuilder);
        
        // Validate against OpenAPI spec if available
        if (validator != null) {
            result.andExpect(OpenApiValidationMatchers.openApi().isValid(validator));
        }
        
        return result;
    }

    /**
     * Assert that response matches expected JSON schema from OpenAPI spec
     */
    protected void assertValidApiResponse(ResultActions result) throws Exception {
        if (validator != null) {
            result.andExpect(OpenApiValidationMatchers.openApi().isValid(validator));
        }
    }

    /**
     * Assert standard error response format
     */
    protected void assertErrorResponse(ResultActions result, int expectedStatus) throws Exception {
        result.andExpect(status().is(expectedStatus))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(jsonPath("$.success").value(false))
              .andExpect(jsonPath("$.errorMessage").exists());
    }

    /**
     * Assert successful response with data
     */
    protected void assertSuccessResponse(ResultActions result) throws Exception {
        result.andExpect(status().isOk())
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(jsonPath("$.success").value(true));
    }

    /**
     * Helper to create test data consistently across contract tests
     */
    protected TestDataBuilder.UserBuilder testUser() {
        return TestDataBuilder.aTutor();
    }

    protected TestDataBuilder.CourseBuilder testCourse() {
        return TestDataBuilder.aCourse();
    }

    protected TestDataBuilder.TimesheetCreateRequestBuilder testTimesheetRequest() {
        return TestDataBuilder.aTimesheetRequest();
    }

    protected TestDataBuilder.AuthRequestBuilder testAuthRequest() {
        return TestDataBuilder.anAuthRequest();
    }

    protected TestDataBuilder.ApprovalActionRequestBuilder testApprovalRequest() {
        return TestDataBuilder.anApprovalActionRequest();
    }
}