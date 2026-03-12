package com.usyd.catams.security;

import com.usyd.catams.entity.User;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test to verify security controls applied to the /actuator/shutdown endpoint.
 * <p>
 * Uses an unauthenticated request to demonstrate the vulnerability during the red phase and
 * validates that only ADMIN users may invoke the shutdown actuator after the fix.
 */
@TestPropertySource(properties = {
        "management.endpoint.shutdown.enabled=true",
        "management.endpoints.web.exposure.include=health,info,shutdown"
})
@DisplayName("Actuator shutdown security integration tests")
class ActuatorShutdownSecurityIntegrationTest extends IntegrationTestBase {

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
