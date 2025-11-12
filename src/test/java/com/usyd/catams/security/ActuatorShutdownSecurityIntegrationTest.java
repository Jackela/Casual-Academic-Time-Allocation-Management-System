package com.usyd.catams.security;

import com.usyd.catams.entity.User;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import com.usyd.catams.testing.PostgresTestContainer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test to verify security controls applied to the /actuator/shutdown endpoint.
 * <p>
 * Uses an unauthenticated request to demonstrate the vulnerability during the red phase and
 * validates that only ADMIN users may invoke the shutdown actuator after the fix.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@TestPropertySource(properties = {
        "management.endpoint.shutdown.enabled=true",
        "management.endpoints.web.exposure.include=health,info,shutdown"
})
@Transactional
@DisplayName("Actuator shutdown security integration tests")
class ActuatorShutdownSecurityIntegrationTest {

    private static final boolean USE_H2 =
            "h2".equalsIgnoreCase(System.getProperty("catams.it.db", System.getenv("IT_DB_ENGINE")));

    private static PostgresTestContainer postgres;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (USE_H2) {
            registry.add("spring.datasource.url", () -> "jdbc:h2:mem:shutdown_it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;CASE_INSENSITIVE_IDENTIFIERS=TRUE");
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
                final String baseJdbcUrl = postgres.getJdbcUrl();
                final String separator = baseJdbcUrl.contains("?") ? "&" : "?";
                final String jdbcUrl = baseJdbcUrl + separator + "prepareThreshold=0&autosave=always&preferQueryMode=simple";
                registry.add("spring.datasource.url", () -> jdbcUrl);
                registry.add("spring.datasource.username", postgres::getUsername);
                registry.add("spring.datasource.password", postgres::getPassword);
                registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
                registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
            } catch (Throwable t) {
                registry.add("spring.datasource.url", () -> "jdbc:h2:mem:shutdown_it_fallback;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;CASE_INSENSITIVE_IDENTIFIERS=TRUE");
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

    private String adminToken;

    @BeforeEach
    void setUp() {
        User adminUser = TestDataBuilder.anAdmin()
                .withId(null)
                .withEmail("shutdown.admin+" + UUID.randomUUID() + "@catams.test")
                .withName("Shutdown Admin Tester")
                .build();

        adminUser = userRepository.save(adminUser);

        adminToken = jwtTokenProvider.generateToken(
                adminUser.getId(),
                adminUser.getEmail(),
                adminUser.getRole().name()
        );
    }

    @Test
    @DisplayName("Should reject unauthenticated shutdown requests")
    void shouldRejectUnauthenticatedShutdownRequest() throws Exception {
        mockMvc.perform(post("/actuator/shutdown"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Admin token can call shutdown endpoint")
    void adminCanInvokeShutdown() throws Exception {
        mockMvc.perform(post("/actuator/shutdown")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().is2xxSuccessful());
    }
}
