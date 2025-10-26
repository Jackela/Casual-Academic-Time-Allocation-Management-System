package com.usyd.catams.performance;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Minimal performance smoke ensuring /api/auth/login stays within basic p95 budget under test env.
 * Uses credentials seeded by IntegrationTestBase helpers.
 */
class AuthPerformanceSmokeIT extends PerformanceTestBase {

    @Test
    @DisplayName("/api/auth/login p95 within threshold")
    void authLogin_p95_withinThreshold() {
        // Ensure test users exist with deterministic password configured in IntegrationTestBase
        seedTestUsers();
        final String payload = "{\"email\":\"admin@integration.test\",\"password\":\"testPassword123\"}";

        // Supplier issues a real login request
        var supplier = (java.util.function.Supplier<MvcResult>) () -> {
            try {
                return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                    .andExpect(status().isOk())
                    .andReturn();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };

        // Sanity: one login should succeed
        try {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
                .andExpect(status().isOk());
        } catch (Exception e) {
            throw new AssertionError("Sanity login failed before performance run: " + e.getMessage(), e);
        }

        // Allow gating via system property to avoid flakiness in constrained environments
        boolean enabled = Boolean.parseBoolean(System.getProperty("perf.smoke.enabled", "false"));
        if (!enabled) {
            // Skip load assertions unless explicitly enabled
            return;
        }

        var result = runLoadTest(supplier, Duration.ofSeconds(3), Math.max(2, concurrentUsers / 2));

        // Assert basic success and p95 triangle under configured threshold
        assertThat(result.getSuccessRate()).isGreaterThan(90.0);
        assertThat(result.getP95ResponseTime()).isLessThanOrEqualTo(authResponseThreshold);
    }
}
