package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.security.JwtTokenProvider;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Base class for integration testing with TestContainers.
 * 
 * This class provides:
 * - Real PostgreSQL database via TestContainers
 * - Full Spring Boot application context
 * - Database transaction management
 * - Common HTTP testing utilities
 * - JWT authentication helpers
 * 
 * Integration tests verify that all components work together correctly
 * with realistic infrastructure dependencies.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers
@Transactional
public abstract class IntegrationTestBase {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("catams_test")
            .withUsername("test_user")
            .withPassword("test_password")
            .withReuse(true); // Reuse container across test classes for performance

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        
        // JPA Configuration for integration tests
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.show-sql", () -> "false");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.format_sql", () -> "false");
        
        // Logging configuration
        registry.add("logging.level.org.springframework.security", () -> "WARN");
        registry.add("logging.level.org.hibernate", () -> "WARN");
        registry.add("logging.level.com.zaxxer.hikari", () -> "WARN");
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    // Pre-built authentication tokens for different roles
    protected String lecturerToken;
    protected String tutorToken;
    protected String adminToken;

    @BeforeEach
    void setupIntegrationTest() {
        setupAuthTokens();
    }

    private void setupAuthTokens() {
        // Create test tokens for each role using test users
        var testLecturer = TestDataBuilder.aLecturer()
            .id(1L)
            .email("lecturer@integration.test")
            .build();
        lecturerToken = "Bearer " + jwtTokenProvider.generateToken(
            testLecturer.getId(), testLecturer.getEmail(), testLecturer.getRole().name()
        );

        var testTutor = TestDataBuilder.aTutor()
            .id(2L)
            .email("tutor@integration.test")
            .build();
        tutorToken = "Bearer " + jwtTokenProvider.generateToken(
            testTutor.getId(), testTutor.getEmail(), testTutor.getRole().name()
        );

        var testAdmin = TestDataBuilder.anAdmin()
            .id(3L)
            .email("admin@integration.test")
            .build();
        adminToken = "Bearer " + jwtTokenProvider.generateToken(
            testAdmin.getId(), testAdmin.getEmail(), testAdmin.getRole().name()
        );
    }

    /**
     * Perform a GET request with optional authentication
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
        
        return mockMvc.perform(requestBuilder);
    }

    /**
     * Perform a POST request with optional authentication
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
        
        return mockMvc.perform(requestBuilder);
    }

    /**
     * Perform a PUT request with optional authentication
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
        
        return mockMvc.perform(requestBuilder);
    }

    /**
     * Perform a DELETE request with optional authentication
     */
    protected ResultActions performDelete(String endpoint, String authToken) throws Exception {
        var requestBuilder = delete(endpoint)
            .contentType(MediaType.APPLICATION_JSON);
            
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        
        return mockMvc.perform(requestBuilder);
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
              .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    /**
     * Helper to create test data consistently across integration tests
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

    /**
     * Get database connection info for debugging
     */
    protected String getDatabaseUrl() {
        return postgres.getJdbcUrl();
    }

    protected boolean isDatabaseRunning() {
        return postgres.isRunning();
    }
}