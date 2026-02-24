package com.usyd.catams.controller;

import com.usyd.catams.service.TestDataResetService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Map;

/**
 * Test-only controller that exposes a deterministic database reset hook.
 *
 * <p><strong>WARNING:</strong> This controller is for testing purposes only and is
 * active exclusively for test and E2E Spring profiles. It should NEVER be enabled
 * in production environments.</p>
 *
 * <p>This controller allows automated test suites to clear database state between
 * runs without manual intervention, ensuring deterministic test execution.</p>
 *
 * @author CAS Team
 * @since 1.0
 * @see TestDataResetService
 */
@RestController
@RequestMapping("/api/test-data")
@Profile({"test", "e2e", "e2e-local"})
public class TestDataResetController {

    private final TestDataResetService resetService;
    private final String resetToken;

    /**
     * Constructs a new TestDataResetController.
     *
     * @param resetService the service for performing database resets
     * @param resetToken the token required for authorization (from app.testing.reset-token)
     * @throws IllegalStateException if resetToken is not configured
     */
    public TestDataResetController(TestDataResetService resetService,
                                   @Value("${app.testing.reset-token:}") String resetToken) {
        this.resetService = resetService;
        if (!StringUtils.hasText(resetToken)) {
            throw new IllegalStateException("Missing app.testing.reset-token configuration for test reset endpoint");
        }
        this.resetToken = resetToken;
    }

    /**
     * Resets the test database to a clean state.
     *
     * <p>This endpoint clears all test data and resets the database to its initial
     * state. It requires a valid reset token to be provided in the X-Test-Reset-Token header.</p>
     *
     * @param providedToken the authorization token from the request header
     * @return ResponseEntity with success status and reset timestamp, or 403 if unauthorized
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetTestData(
        @RequestHeader(name = "X-Test-Reset-Token", required = false) String providedToken
    ) {
        if (providedToken == null || !providedToken.equals(resetToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Invalid or missing reset token"
            ));
        }

        resetService.resetDatabase();
        return ResponseEntity.ok(Map.of(
            "success", true,
            "resetAt", Instant.now().toString()
        ));
    }

    /**
     * Cleans up demo users created during testing.
     *
     * <p>This endpoint removes demo/test users from the database while preserving
     * other data. It requires a valid reset token to be provided in the request header.</p>
     *
     * @param providedToken the authorization token from the request header
     * @return ResponseEntity with success status, deleted count, and cleanup timestamp,
     *         or 403 if unauthorized
     */
    @PostMapping("/cleanup-demo-users")
    public ResponseEntity<Map<String, Object>> cleanupDemoUsers(
        @RequestHeader(name = "X-Test-Reset-Token", required = false) String providedToken
    ) {
        if (providedToken == null || !providedToken.equals(resetToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "success", false,
                "message", "Invalid or missing reset token"
            ));
        }

        int deletedCount = resetService.cleanupDemoUsers();
        return ResponseEntity.ok(Map.of(
            "success", true,
            "deletedCount", deletedCount,
            "cleanedAt", Instant.now().toString()
        ));
    }
}
