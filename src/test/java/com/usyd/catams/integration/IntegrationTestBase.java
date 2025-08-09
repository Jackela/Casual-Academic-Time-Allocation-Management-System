package com.usyd.catams.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.usyd.catams.security.JwtTokenProvider;
import com.usyd.catams.testdata.TestDataBuilder;
import com.usyd.catams.testing.PostgresTestContainer;
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
        // Ensure container is started
        if (!postgres.isRunning()) {
            postgres.start();
        }
        
        // Database connection properties
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.show-sql", () -> "false");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    protected String lecturerToken;
    protected String tutorToken;
    protected String adminToken;

    @BeforeEach
    void setupIntegrationTest() {
        setupAuthTokens();
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

