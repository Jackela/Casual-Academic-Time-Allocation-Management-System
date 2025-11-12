package com.usyd.catams.integration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import com.usyd.catams.testdata.TestDataBuilder;
import com.usyd.catams.testing.PostgresTestContainer;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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

import java.util.Arrays;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Transactional
public abstract class IntegrationTestBase {

    private static final boolean RUNNING_IN_ACT = System.getenv("ACT_TOOLSDIRECTORY") != null || System.getenv("ACT") != null;

    static {
        if (RUNNING_IN_ACT) {
            System.setProperty("testcontainers.ryuk.disabled", "true");
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Default to Testcontainers/Postgres. Allow explicit H2 opt-in via IT_DB_ENGINE=h2 or -Dcatams.it.db=h2
        String engineProp = System.getProperty("catams.it.db", System.getenv("IT_DB_ENGINE"));
        boolean useH2 = engineProp != null && engineProp.trim().equalsIgnoreCase("h2");
        if (useH2) {
            System.out.println("[IntegrationTestBase] Using explicit H2 engine for integration tests (catams.it.db=h2)");
            registry.add("spring.datasource.url", () -> "jdbc:h2:mem:catams_it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;CASE_INSENSITIVE_IDENTIFIERS=TRUE");
            registry.add("spring.datasource.username", () -> "sa");
            registry.add("spring.datasource.password", () -> "");
            registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
            registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.H2Dialect");
        } else {
            try {
                PostgresTestContainer postgres = PostgresTestContainer.getInstance();
                if (!postgres.isRunning()) {
                    postgres.start();
                }
                // Disable prepared statement caching and force JDBC to resubmit statements after schema changes
                String baseJdbcUrl = postgres.getJdbcUrl();
                String separator = baseJdbcUrl.contains("?") ? "&" : "?";
                String jdbcUrl = baseJdbcUrl + separator + "prepareThreshold=0&autosave=always&preferQueryMode=simple";
                registry.add("spring.datasource.url", () -> jdbcUrl);
                registry.add("spring.datasource.username", postgres::getUsername);
                registry.add("spring.datasource.password", postgres::getPassword);
                registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
                registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
            } catch (Throwable t) {
                // Fail fast: no fallback to H2 per project preference
                throw new IllegalStateException("Docker/Testcontainers not available. Start Docker Desktop and retry integration tests.", t);
            }
        }

        // Let Flyway manage schema completely - disable Hibernate DDL
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
        registry.add("spring.jpa.show-sql", () -> "false");
        registry.add("spring.flyway.enabled", () -> "true");
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

    @PersistenceContext
    protected EntityManager entityManager;

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
     * Flushes and clears the EntityManager to avoid PostgreSQL prepared statement cache issues.
     */
    protected void seedTestUsers() {
        // Clear any cached statements from previous operations
        entityManager.flush();
        entityManager.clear();

        String defaultPassword = "testPassword123";
        String hashedPassword = passwordEncoder.encode(defaultPassword);

          var testAdmin = TestDataBuilder.anAdmin()
              .withEmail("admin@integration.test")
            .withName("Test Admin")
            .withHashedPassword(hashedPassword)
            .build();
        userRepository.save(testAdmin);

          var testLecturer = TestDataBuilder.aLecturer()
              .withEmail("lecturer@integration.test")
              .withName("Test Lecturer")
              .withHashedPassword(hashedPassword)
              .build();
          userRepository.save(testLecturer);

          var testTutor = TestDataBuilder.aTutor()
              .withEmail("tutor@integration.test")
              .withName("Test Tutor")
              .withHashedPassword(hashedPassword)
              .build();
          userRepository.save(testTutor);

        // Flush to ensure saves are executed immediately
        entityManager.flush();
    }

    private void setupAuthTokens() {
        var testLecturer = TestDataBuilder.aLecturer().withEmail("lecturer@integration.test").build();
        lecturerToken = "Bearer " + jwtTokenProvider.generateToken(999L, testLecturer.getEmail(), testLecturer.getRole().name());

        var testTutor = TestDataBuilder.aTutor().withEmail("tutor@integration.test").build();
        tutorToken = "Bearer " + jwtTokenProvider.generateToken(998L, testTutor.getEmail(), testTutor.getRole().name());

        var testAdmin = TestDataBuilder.anAdmin().withEmail("admin@integration.test").build();
        adminToken = "Bearer " + jwtTokenProvider.generateToken(997L, testAdmin.getEmail(), testAdmin.getRole().name());
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

    protected ResultActions performPostWithoutFinancialFields(String endpoint, Object requestBody, String authToken) throws Exception {
        var requestBuilder = post(endpoint).contentType(MediaType.APPLICATION_JSON);
        if (requestBody != null) {
            requestBuilder.content(toJsonWithoutFinancialFields(requestBody));
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

    protected ResultActions performPutWithoutFinancialFields(String endpoint, Object requestBody, String authToken) throws Exception {
        var requestBuilder = put(endpoint).contentType(MediaType.APPLICATION_JSON);
        if (requestBody != null) {
            requestBuilder.content(toJsonWithoutFinancialFields(requestBody));
        }
        if (authToken != null) {
            requestBuilder.header("Authorization", authToken);
        }
        return mockMvc.perform(requestBuilder);
    }

    protected String toJsonWithoutFinancialFields(Object payload) throws JsonProcessingException {
        if (payload == null) {
            return "";
        }
        JsonNode node = objectMapper.valueToTree(payload);
        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            objectNode.remove(Arrays.asList("hours", "payableHours", "hourlyRate", "amount", "associatedHours", "rateCode"));
            return objectMapper.writeValueAsString(objectNode);
        }
        return objectMapper.writeValueAsString(payload);
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
              .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
              .andExpect(jsonPath("$.success").value(false))
              .andExpect(jsonPath("$.error").exists())
              .andExpect(jsonPath("$.traceId").exists())
              .andExpect(jsonPath("$.message").exists());
    }

    protected void assertSuccessResponse(ResultActions result) throws Exception {
        result.andExpect(status().isOk())
              .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}

