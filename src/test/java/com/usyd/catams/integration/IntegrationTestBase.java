package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import com.usyd.catams.testdata.TestDataBuilder;
import com.usyd.catams.testing.PostgresTestContainer;
import org.springframework.security.crypto.password.PasswordEncoder;
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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Testcontainers
@Transactional
public abstract class IntegrationTestBase {

    @Container
    static PostgresTestContainer postgres = PostgresTestContainer.getInstance();
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        String engineProp = System.getProperty("catams.it.db", System.getenv("IT_DB_ENGINE"));
        boolean useH2 = engineProp != null && engineProp.trim().equalsIgnoreCase("h2");
        if (useH2) {
            // Explicit, opt-in H2 fallback (PostgreSQL compatibility mode)
            System.out.println("[IntegrationTestBase] Using explicit H2 engine for integration tests (catams.it.db=h2)");
            registry.add("spring.datasource.url", () -> "jdbc:h2:mem:catams_it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;CASE_INSENSITIVE_IDENTIFIERS=TRUE");
            registry.add("spring.datasource.username", () -> "sa");
            registry.add("spring.datasource.password", () -> "");
            registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
            registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.H2Dialect");
        } else {
            // Strict default: require Testcontainers PostgreSQL
            try {
                if (!postgres.isRunning()) {
                    postgres.start();
                }
            } catch (Throwable t) {
                throw new IllegalStateException("Failed to start Testcontainers PostgreSQL for integration tests. Set -Dcatams.it.db=h2 if you explicitly want to run against H2. Root cause: " + t.getMessage(), t);
            }
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
            registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
            registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        }

        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.show-sql", () -> "false");
        // Hard-disable Flyway for integration tests to avoid accidental migration runs
        registry.add("spring.flyway.enabled", () -> "false");
    }

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

    protected String lecturerToken;
    protected String tutorToken;
    protected String adminToken;

    @BeforeEach
    void setupIntegrationTest() {
        setupAuthTokens();
    }

    /**
     * Seeds test users in the database to support JWT authentication validation.
     * Creates users that match the JWT token emails from TestAuthenticationHelper.
     * This method can be called by individual test classes that need these base users.
     */
    protected void seedTestUsers() {
        // Create and persist test users that match JWT token emails from TestAuthenticationHelper
        String defaultPassword = "testPassword123";
        String hashedPassword = passwordEncoder.encode(defaultPassword);
        
        var testAdmin = TestDataBuilder.anAdmin()
            .withId(1L)
            .withEmail("admin@integration.test")
            .withName("Test Admin")
            .withHashedPassword(hashedPassword)
            .build();
        userRepository.save(testAdmin);
        
        var testLecturer = TestDataBuilder.aLecturer()
            .withId(1L) 
            .withEmail("lecturer1@integration.test")  // Matches TestAuthenticationHelper pattern
            .withName("Test Lecturer 1")
            .withHashedPassword(hashedPassword)
            .build();
        userRepository.save(testLecturer);
        
        var testTutor = TestDataBuilder.aTutor()
            .withId(1L)
            .withEmail("tutor1@integration.test")     // Matches TestAuthenticationHelper pattern
            .withName("Test Tutor 1")
            .withHashedPassword(hashedPassword) 
            .build();
        userRepository.save(testTutor);
    }

    private void setupAuthTokens() {
        var testLecturer = TestDataBuilder.aLecturer().withId(1L).withEmail("lecturer@integration.test").build();
        lecturerToken = "Bearer " + jwtTokenProvider.generateToken(testLecturer.getId(), testLecturer.getEmail(), testLecturer.getRole().name());

        var testTutor = TestDataBuilder.aTutor().withId(2L).withEmail("tutor@integration.test").build();
        tutorToken = "Bearer " + jwtTokenProvider.generateToken(testTutor.getId(), testTutor.getEmail(), testTutor.getRole().name());

        var testAdmin = TestDataBuilder.anAdmin().withId(3L).withEmail("admin@integration.test").build();
        adminToken = "Bearer " + jwtTokenProvider.generateToken(testAdmin.getId(), testAdmin.getEmail(), testAdmin.getRole().name());
    }

    protected ResultActions performGet(String endpoint, String authToken) throws Exception {
        var requestBuilder = get(endpoint).contentType(MediaType.APPLICATION_JSON);
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        return mockMvc.perform(requestBuilder);
    }

    protected ResultActions performPost(String endpoint, Object requestBody, String authToken) throws Exception {
        var requestBuilder = post(endpoint).contentType(MediaType.APPLICATION_JSON);
        if (requestBody != null) {
            requestBuilder.content(objectMapper.writeValueAsString(requestBody));
        }
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        return mockMvc.perform(requestBuilder);
    }

    protected ResultActions performPut(String endpoint, Object requestBody, String authToken) throws Exception {
        var requestBuilder = put(endpoint).contentType(MediaType.APPLICATION_JSON);
        if (requestBody != null) {
            requestBuilder.content(objectMapper.writeValueAsString(requestBody));
        }
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        return mockMvc.perform(requestBuilder);
    }

    protected ResultActions performDelete(String endpoint, String authToken) throws Exception {
        var requestBuilder = delete(endpoint).contentType(MediaType.APPLICATION_JSON);
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        return mockMvc.perform(requestBuilder);
    }

    protected void assertErrorResponse(ResultActions result, int expectedStatus) throws Exception {
        result.andExpect(status().is(expectedStatus))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(jsonPath("$.success").value(false))
              .andExpect(jsonPath("$.errorMessage").exists());
    }

    protected void assertSuccessResponse(ResultActions result) throws Exception {
        result.andExpect(status().isOk())
              .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}

